<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\VaultMovement;
use App\Services\ContributionService;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoWebhookVerifier;
use App\Services\PaymentNotificationService;
use App\Services\TontinePayoutService;
use App\Services\VaultTransactionService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

/**
 * POST /webhooks/yabeto — public route (no auth:sanctum, Yabeto isn't one of our users), the
 * authoritative confirmation path for anything that came back `processing` from a synchronous
 * request (see VaultController/GroupController). See yabeto.md §7.
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

        // Event naming is inconsistent across Yabeto's own docs (`intent.completed` vs.
        // `payment_intent.succeeded`) — handled defensively rather than trusting one name.
        $event = (string) $request->header('X-Yabetoo-Webhook-Event', '');
        $payload = $request->json()->all();
        $reference = $payload['id'] ?? $payload['intentId'] ?? null;
        $status = $payload['status'] ?? null;

        if (! is_string($reference) || ! is_string($status)) {
            return response()->noContent(200);
        }

        if (in_array($event, ['intent.completed', 'payment_intent.succeeded'], true)) {
            $this->resolvePaymentIntent($reference, $status);
        } elseif ($event === 'disbursement.completed') {
            $this->resolveDisbursement($reference, $status);
        } else {
            Log::info('Unhandled Yabeto webhook event', ['event' => $event, 'reference' => $reference]);
        }

        return response()->noContent(200);
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
                $this->paymentNotifications->depositSucceeded($resolved->vault->user, (float) $resolved->amount);
            } elseif ($status === 'failed') {
                $this->paymentNotifications->depositFailed($resolved->vault->user, (float) $resolved->amount);
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
            $this->paymentNotifications->withdrawSucceeded($resolved->vault->user, (float) $resolved->amount);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->withdrawFailed($resolved->vault->user, (float) $resolved->amount);
        }
    }
}
