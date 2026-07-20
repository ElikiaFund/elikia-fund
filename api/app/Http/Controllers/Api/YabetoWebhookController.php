<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contribution;
use App\Models\VaultMovement;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoWebhookVerifier;
use App\Services\PaymentNotificationService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
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
            $config->webhookSecret,
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
     * — both are created via YabetoService::createPaymentIntent/confirmPaymentIntent.
     */
    private function resolvePaymentIntent(string $reference, string $status): void
    {
        $movement = VaultMovement::where('type', 'deposit')->where('yabeto_reference', $reference)->first();

        if ($movement) {
            $this->finalizeDeposit($movement, $status);

            return;
        }

        $contribution = Contribution::with(['user', 'group'])->where('yabeto_reference', $reference)->first();

        if (! $contribution || $contribution->status === $status) {
            return;
        }

        $contribution->update(['status' => $status]);

        if ($status === 'succeeded') {
            $this->paymentNotifications->contributionSucceeded($contribution->user, $contribution->group, (float) $contribution->amount);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->contributionFailed($contribution->user, $contribution->group, (float) $contribution->amount);
        }
    }

    private function finalizeDeposit(VaultMovement $movement, string $status): void
    {
        if ($movement->status === $status) {
            return;
        }

        DB::transaction(function () use ($movement, $status) {
            if ($status === 'succeeded' && $movement->status !== 'succeeded') {
                $movement->vault()->increment('balance', $movement->amount);
            }

            $movement->update(['status' => $status]);
        });

        if ($status === 'succeeded') {
            $this->paymentNotifications->depositSucceeded($movement->vault->user, (float) $movement->amount);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->depositFailed($movement->vault->user, (float) $movement->amount);
        }
    }

    private function resolveDisbursement(string $reference, string $status): void
    {
        $movement = VaultMovement::where('type', 'withdraw')->where('yabeto_reference', $reference)->first();

        if (! $movement || $movement->status === $status) {
            return;
        }

        DB::transaction(function () use ($movement, $status) {
            // Withdrawals reserve funds immediately (VaultController::withdrawViaYabeto) — refund
            // if the payout ultimately failed.
            if ($status === 'failed' && $movement->status !== 'failed') {
                $movement->vault()->increment('balance', $movement->amount);
            }

            $movement->update(['status' => $status]);
        });

        if ($status === 'succeeded') {
            $this->paymentNotifications->withdrawSucceeded($movement->vault->user, (float) $movement->amount);
        } elseif ($status === 'failed') {
            $this->paymentNotifications->withdrawFailed($movement->vault->user, (float) $movement->amount);
        }
    }
}
