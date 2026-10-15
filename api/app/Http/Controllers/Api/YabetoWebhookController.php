<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\VaultMovement;
use App\Models\YabetoWebhookEvent;
use App\Services\ContributionService;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoEventPayload;
use App\Services\Payment\YabetoWebhookVerifier;
use App\Services\PaymentNotificationService;
use App\Services\TontinePayoutService;
use App\Services\VaultTransactionService;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * POST /webhooks/yabeto — public route (no auth:sanctum, Yabeto isn't one of our users), the
 * authoritative confirmation path for anything that came back `processing` from a synchronous
 * request (see VaultController/GroupController). See yabeto.md §7 and docs/fr/connect/webhooks.
 *
 * Handles both the plain legacy events (intent.completed / disbursement.completed) AND the 7
 * Connect events, with per-event dedup gated by the yabeto_webhook_events table (required
 * because `connect.*_blocked_insufficient_funds` have no idempotency anchor on Yabeto's side).
 */
class YabetoWebhookController extends Controller
{
    public function __construct(
        private readonly YabetoWebhookVerifier $verifier,
        private readonly YabetoConfig $config,
        private readonly PaymentNotificationService $paymentNotifications,
        private readonly VaultTransactionService $vaultTransactions,
        private readonly ContributionService $contributions,
        private readonly TontinePayoutService $payouts,
    ) {}

    public function __invoke(Request $request): Response
    {
        if (! $this->config->webhookSecret) {
            Log::warning('Yabeto webhook received but no webhook secret is configured — ignoring.');

            return response()->noContent(200);
        }

        $verified = $this->verifier->verify(
            $request->getContent(),
            (string) $request->header('X-Yabetoo-Webhook-Timestamp', ''),
            (string) $request->header('X-Yabetoo-Webhook-Signature', ''),
            $this->config->webhookSecret,
        );

        if (! $verified) {
            Log::warning('Yabeto webhook signature verification failed.');

            return response()->noContent(401);
        }

        $payload = YabetoEventPayload::fromRequest(
            (string) $request->header('X-Yabetoo-Webhook-Event', ''),
            $request->json()->all(),
        );

        // Dedup Connect events only: their envelope `id` is a real event id, and the two
        // `*_blocked_insufficient_funds` events have no other idempotency anchor. Legacy events
        // are flat — their top-level `id` is the payment reference, not an event id — and their
        // handlers are already idempotent (terminal status transitions no-op).
        if ($payload->isConnectEvent() && $payload->id) {
            try {
                YabetoWebhookEvent::create([
                    'event_id' => $payload->id,
                    'event_type' => $payload->type,
                    'received_at' => now(),
                ]);
            } catch (UniqueConstraintViolationException) {
                Log::info('Yabeto webhook duplicate delivery ignored', ['event_id' => $payload->id, 'type' => $payload->type]);

                return response()->noContent(200);
            }
        }

        $this->dispatch($payload);

        return response()->noContent(200);
    }

    /**
     * Routes an event to its handler. Legacy events (intent.completed / disbursement.completed)
     * keep the shape they had pre-Connect; the 7 Connect events are new. All handlers are
     * idempotent on our side (status transitions no-op when already-terminal).
     */
    private function dispatch(YabetoEventPayload $payload): void
    {
        // Legacy events carry the reference and status at the top level of the body.
        $reference = (string) ($payload->body['id'] ?? $payload->body['intentId'] ?? '');
        $status = (string) ($payload->body['status'] ?? '');

        switch ($payload->type) {
            case 'intent.completed':
            case 'payment_intent.succeeded':
                if ($reference && $status) {
                    $this->resolvePaymentIntent($reference, $status);
                }

                return;

            case 'disbursement.completed':
                if ($reference && $status) {
                    $this->resolveDisbursement($reference, $status);
                }

                return;

                // Connect: an application fee was collected on direct-charge capture
                // (docs/fr/connect/webhooks). We don't need to react — the capture itself fires
                // `payment_intent.succeeded` and that path already records the Connect block from
                // the PaymentIntentResult. Log for the audit story.
            case 'connect.application_fee.created':
            case 'connect.application_fee.refunded':
            case 'connect.transfer.created':
            case 'connect.transfer.reversed':
                Log::info('Connect ledger event received', ['type' => $payload->type, 'account' => $payload->accountId]);

                return;

                // The signal to trigger a tontine payout: funds on a group company's connected
                // account have matured from pending → available. If an eligible cycle for that
                // company is awaiting its payout, this is the moment to disburse.
            case 'connect.funds.available':
                $this->onFundsAvailable($payload);

                return;

                // Both refund/reversal insufficient-funds events mean Elikia has to top up its own
                // marketplace balance before a refund can go through. Surface loudly — this is the
                // only alert channel docs mention for these conditions.
            case 'connect.refund.blocked_insufficient_funds':
            case 'connect.reversal.blocked_insufficient_funds':
                Log::warning('Connect operation blocked for insufficient funds — Elikia must top up marketplace balance', [
                    'type' => $payload->type,
                    'account' => $payload->accountId,
                    'required' => $payload->dataGet('required'),
                    'available' => $payload->dataGet('available'),
                    'shortfall' => $payload->dataGet('shortfall'),
                    'currency' => $payload->dataGet('currency'),
                ]);

                return;

            default:
                Log::info('Unhandled Yabeto webhook event', ['type' => $payload->type, 'id' => $payload->id]);
        }
    }

    /**
     * A payment intent reference can belong to either a vault deposit or a tontine contribution
     * — both are created via YabetoService::createPaymentIntent/confirmPaymentIntent. Resolution
     * itself (locking, the balance side-effect, no-op on a stale/duplicate delivery) lives in
     * VaultTransactionService/ContributionService — this only decides which one owns the
     * reference and fires the matching notification once a transition actually happened.
     */
    private function resolvePaymentIntent(string $reference, string $status): void
    {
        $movement = VaultMovement::where('type', 'deposit')->where('yabeto_reference', $reference)->first();

        if ($movement) {
            $resolved = $this->vaultTransactions->resolveMovementStatus($movement->id, $status);

            if (! $resolved) {
                return;
            }

            if ($status === 'succeeded') {
                $this->paymentNotifications->depositSucceeded($resolved->vault->company->user, (float) $resolved->amount);
            } elseif ($status === 'failed') {
                $this->paymentNotifications->depositFailed($resolved->vault->company->user, (float) $resolved->amount);
            }

            return;
        }

        $contribution = Contribution::where('yabeto_reference', $reference)->first();

        if (! $contribution) {
            return;
        }

        $resolved = $this->contributions->resolveStatus($contribution->id, $status);

        if (! $resolved) {
            return;
        }

        $resolved->loadMissing(['user', 'group']);

        if ($status === 'succeeded') {
            $this->paymentNotifications->contributionSucceeded($resolved->user, $resolved->group, (float) $resolved->amount);
            $this->payouts->disburseIfEligibleAndNotify($resolved->group, $resolved->cycle_period);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->contributionFailed($resolved->user, $resolved->group, (float) $resolved->amount);
        }
    }

    private function resolveDisbursement(string $reference, string $status): void
    {
        $movement = VaultMovement::where('type', 'withdraw')->where('yabeto_reference', $reference)->first();

        if (! $movement) {
            return;
        }

        $resolved = $this->vaultTransactions->resolveMovementStatus($movement->id, $status);

        if (! $resolved) {
            return;
        }

        if ($status === 'succeeded') {
            $this->paymentNotifications->withdrawSucceeded($resolved->vault->company->user, (float) $resolved->amount);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->withdrawFailed($resolved->vault->company->user, (float) $resolved->amount);
        }
    }

    /**
     * `connect.funds.available` fires when a company's connected-account funds mature from
     * pending → available. If any tontine cycle on a group belonging to that company is both
     * fully-contributed and still awaiting payout, this is the right moment to disburse.
     * Idempotent — disburseIfEligibleAndNotify() no-ops on already-paid cycles.
     */
    private function onFundsAvailable(YabetoEventPayload $payload): void
    {
        $accountId = $payload->accountId;

        if (! $accountId) {
            return;
        }

        $groups = Group::whereHas('company', fn ($q) => $q->where('yabeto_account_id', $accountId))->get();

        foreach ($groups as $group) {
            $pendingCycles = GroupCycleRecipient::where('group_id', $group->id)
                ->whereNull('paid_out_at')
                ->pluck('cycle_period');

            foreach ($pendingCycles as $cyclePeriod) {
                $this->payouts->disburseIfEligibleAndNotify($group, $cyclePeriod);
            }
        }
    }
}
