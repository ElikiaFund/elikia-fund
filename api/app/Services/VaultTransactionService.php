<?php

namespace App\Services;

use App\Exceptions\FeeException;
use App\Exceptions\VaultTransactionException;
use App\Models\Vault;
use App\Models\VaultMovement;
use App\Models\YabetoSetting;
use App\Services\Payment\DTOs\DisbursementResult;
use App\Services\Payment\YabetoConnectClient;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\Payment\YabetoStatus;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Owns every real-money vault-balance mutation (Yabeto deposit/withdraw) so the balance change
 * and the VaultMovement audit row are always applied together, exactly once, under a lock —
 * mirrors TontinePayoutService's shape. The local VaultMovement row is created with status
 * 'processing' *before* any call to Yabeto, so a transport failure (timeout, dropped connection)
 * still leaves a durable local record to reconcile against instead of vanishing silently — the
 * previous code only wrote the row after a successful Yabeto response.
 *
 * The purely-simulated deposit/withdraw fallback (no Yabeto configured) stays in VaultController:
 * it's a single atomic DB::transaction with no external call, so it carries none of the
 * retry/duplicate risk this service exists to close.
 */
class VaultTransactionService
{
    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly YabetoConnectClient $connectClient,
        private readonly YabetoConnectGate $connectGate,
        private readonly FeeService $fees,
        private readonly VaultFraudDetectionService $fraudDetection,
    ) {}

    /**
     * Phase A router: a company signed up under Connect (its `yabeto_account_id` is set and KYC
     * is approved) uses the Connect money paths; everyone else (legacy pre-Connect merchants,
     * or new signups still pending KYC) continues on the plain-Yabeto path. One check, one
     * place, so the branch is readable and reversible per-service.
     *
     * Deliberately requires `isConnectReady()` (KYC approved, `withdraw` in allowed_operations)
     * — not just `hasConnectAccount()`. An un-approved Connect merchant would accumulate funds
     * in Yabeto's pending balance that may be refunded charge-by-charge on rejection, which is
     * catastrophic for a tontine or a savings vault. We'd rather fall back to legacy for that
     * window.
     */
    private function shouldUseConnect(Vault $vault): bool
    {
        return $this->connectGate->routesThroughConnect($vault->company);
    }

    /**
     * @return array{vault: Vault, movement: VaultMovement, message?: string}
     *
     * @throws VaultTransactionException if a deposit is already processing for this vault
     * @throws FeeException if the requested amount doesn't net anything after fees
     */
    public function deposit(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): array
    {
        // Best-effort, outside any lock: if the vault's last deposit attempt is stuck
        // `processing` (the webhook never arrived, or the original request hit a transport error
        // and never got a clean resolution), ask Yabeto directly before deciding to block a retry
        // on it — otherwise a genuinely dead attempt blocks every future deposit until the
        // scheduled payments:reconcile-pending sweep eventually catches it (up to 15 min later).
        $this->reconcileStuck($vault, 'deposit');

        $fee = $this->fees->deposit($amount);

        $movement = DB::transaction(function () use ($vault, $amount, $fee, $methodLabel, $phone) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            if ($locked->movements()->where('type', 'deposit')->whereNotIn('status', YabetoStatus::TERMINAL)->exists()) {
                throw new VaultTransactionException('Un dépôt est déjà en cours de confirmation.');
            }

            return $locked->movements()->create([
                'type' => 'deposit',
                'amount' => $amount,
                'fee_amount' => $fee['fee_amount'],
                'provider_fee_amount' => $fee['provider_fee_amount'],
                'platform_fee_amount' => $fee['platform_fee_amount'],
                'net_amount' => $fee['net_amount'],
                'note' => "Dépôt via {$methodLabel}.",
                'provider' => 'yabeto',
                'status' => 'processing',
                'phone' => $phone,
            ]);
        });

        try {
            // Phase A branch: Connect merchants deposit via `on_behalf_of` to their own
            // connected account (funds land on *their* Yabeto balance, not Elikia's); legacy
            // merchants keep the pre-Connect path. See shouldUseConnect().
            if ($this->shouldUseConnect($vault)) {
                $feeRate = (float) YabetoSetting::current()->default_application_fee_rate;

                $intent = $this->yabeto->createPaymentIntentOnBehalfOf(
                    (int) round($amount),
                    $vault->company->yabeto_account_id,
                    $feeRate,
                    'Dépôt coffre Elikia Fund',
                    ['vault_id' => $vault->id, 'movement_id' => $movement->id, 'routing' => 'connect'],
                );
            } else {
                $intent = $this->yabeto->createPaymentIntent(
                    (int) round($amount),
                    'Dépôt coffre Elikia Fund',
                    ['vault_id' => $vault->id, 'movement_id' => $movement->id],
                );
            }

            $movement->update(['yabeto_reference' => $intent->id]);

            $result = $this->yabeto->confirmPaymentIntent(
                $intent->id,
                $intent->clientSecret ?? '',
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->company->user->name,
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto deposit request failed', ['message' => $e->getMessage(), 'movement_id' => $movement->id]);

            // Nothing to roll back — the balance was never touched, and Yabeto may still have
            // received the request despite the transport error on our end. The movement stays
            // 'processing'; a later refresh-status call or webhook resolves it.
            return [
                'vault' => $vault->fresh(),
                'movement' => $movement->fresh(),
                'message' => "Nous n'avons pas pu confirmer votre dépôt immédiatement. Il est en cours de traitement.",
            ];
        }

        $resolved = $this->resolveMovementStatus($movement->id, $result->status) ?? $movement->fresh();

        return array_filter([
            'vault' => $vault->fresh(),
            'movement' => $resolved,
            'message' => $result->failed() ? ($result->failureMessage ?? 'Le paiement a échoué.') : null,
        ], fn ($value) => $value !== null);
    }

    /**
     * @return array{vault: Vault, movement: VaultMovement, message?: string}
     *
     * @throws VaultTransactionException if a withdrawal is already processing, or the balance
     *                                   (re-checked under lock, not the possibly-stale value the caller read) is insufficient
     * @throws FeeException if the requested amount doesn't leave anything to disburse after fees
     */
    public function withdraw(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): array
    {
        $this->reconcileStuck($vault, 'withdraw');

        // Phase A constraint: Connect withdrawals are all-or-nothing on Yabeto's side
        // (docs/fr/connect/payouts — sending `amount` returns 422). We expose this to the
        // caller as "pas de retrait partiel" rather than silently withdrawing more than
        // requested; the mobile app renders a two-step UI ("retirer tout, puis redéposer
        // ce que vous voulez garder en épargne" — the "verrouiller comme épargne" primitive).
        if ($this->shouldUseConnect($vault) && (float) $amount !== (float) $vault->balance) {
            throw new VaultTransactionException(
                'Les comptes Yabeto Connect ne supportent que le retrait de la totalité du solde. '
                .'Retirez le solde complet puis redéposez le montant à conserver en épargne.'
            );
        }

        $fee = $this->fees->withdrawal($amount);

        $movement = DB::transaction(function () use ($vault, $amount, $fee, $methodLabel, $phone) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            if ($locked->movements()->where('type', 'withdraw')->whereNotIn('status', YabetoStatus::TERMINAL)->exists()) {
                throw new VaultTransactionException('Un retrait est déjà en cours de confirmation.');
            }

            if ($amount > (float) $locked->balance) {
                throw new VaultTransactionException('Solde insuffisant.');
            }

            // Reserve the funds immediately, before Yabeto is even called — refunded by
            // resolveMovementStatus() if the payout ultimately fails. The previous code's comment
            // claimed this already happened; the code itself only decremented after a successful
            // Disbursement response, which this fixes. The vault is debited the full gross amount
            // (what the user asked to withdraw) — the fee is the gap between that and what Yabeto
            // actually pays out below, not an extra amount taken on top of the withdrawal.
            $locked->decrement('balance', $amount);

            return $locked->movements()->create([
                'type' => 'withdraw',
                'amount' => $amount,
                'fee_amount' => $fee['fee_amount'],
                'provider_fee_amount' => $fee['provider_fee_amount'],
                'platform_fee_amount' => $fee['platform_fee_amount'],
                'net_amount' => $fee['net_amount'],
                'note' => "Retrait via {$methodLabel}.",
                'provider' => 'yabeto',
                'status' => 'processing',
                'phone' => $phone,
            ]);
        });

        try {
            if ($this->shouldUseConnect($vault)) {
                // Phase A Connect withdraw: payout the full available balance to the merchant's
                // own registered payout destination (the phone they entered during Yabeto's
                // hosted KYC). Yabeto doesn't let us pass a phone here — the destination is
                // whatever the merchant registered on verify.yabetoo.com. Idempotency key
                // scopes per-movement so retries don't double-pay.
                $connectResult = $this->connectClient->withdraw(
                    $vault->company->yabeto_account_id,
                    "vault_withdraw:movement:{$movement->id}",
                );

                $movement->update(['yabeto_reference' => $connectResult->id]);

                // Connect withdraw is synchronous; its status is the final verdict (a 201 with
                // status="failed" is a real failure, not a transport blip, per docs). Wrap it
                // in the same shape as DisbursementResult so the resolveMovementStatus path
                // below works unchanged.
                $result = new DisbursementResult(
                    id: $connectResult->id,
                    status: $connectResult->status,
                    failureMessage: $connectResult->isSuccessful() ? null : 'Le retrait Connect a échoué côté opérateur.',
                );
            } else {
                // Disbursement pays out the NET amount — the vault above was already debited
                // the full gross amount the user asked to withdraw; the difference is the fee.
                $result = $this->yabeto->createDisbursement(
                    (int) round($fee['net_amount']),
                    $phone,
                    YabetoService::OPERATOR_MAP[$paymentMethod],
                    $vault->company->user->name,
                );

                $movement->update(['yabeto_reference' => $result->id]);
            }
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto withdrawal request failed', ['message' => $e->getMessage(), 'movement_id' => $movement->id]);

            // Balance is already reserved above — don't blindly refund, since Yabeto may have
            // processed the disbursement despite the transport error. Leave 'processing'.
            return [
                'vault' => $vault->fresh(),
                'movement' => $movement->fresh(),
                'message' => 'Votre retrait est en cours de traitement. Contactez le support s\'il ne se confirme pas rapidement.',
            ];
        }

        $resolved = $this->resolveMovementStatus($movement->id, $result->status) ?? $movement->fresh();

        return array_filter([
            'vault' => $vault->fresh(),
            'movement' => $resolved,
            'message' => $result->failed() ? ($result->failureMessage ?? 'Le retrait a échoué.') : null,
        ], fn ($value) => $value !== null);
    }

    /**
     * The only place a movement's balance side-effect is ever applied — deposits credit the vault
     * exactly once on the succeeded transition; withdrawals (already debited eagerly at
     * withdraw() time) refund exactly once on the failed transition. Locked so a webhook delivery
     * racing a manual refresh-status call — or two racing webhook deliveries — can never apply
     * the same transition twice. Only ever transitions a movement out of 'processing': a
     * movement already terminal is left alone, since a late/duplicate/contradictory status
     * report for an already-resolved movement must never mutate the balance again.
     */
    public function resolveMovementStatus(int $movementId, string $newStatus): ?VaultMovement
    {
        $movement = DB::transaction(function () use ($movementId, $newStatus) {
            /** @var VaultMovement|null $movement */
            $movement = VaultMovement::where('id', $movementId)->lockForUpdate()->first();

            if (! $movement || YabetoStatus::isTerminal($movement->status) || $movement->status === $newStatus) {
                return null;
            }

            $vault = Vault::whereKey($movement->vault_id)->lockForUpdate()->first();

            if ($vault) {
                if ($movement->type === 'deposit' && $newStatus === 'succeeded') {
                    // Credit only the post-fee amount — the gap between gross (what Yabeto
                    // collected) and net (what actually lands in the vault) is the fee.
                    $vault->increment('balance', $movement->net_amount);
                } elseif ($movement->type === 'withdraw' && $newStatus === 'failed') {
                    // Refund the full gross amount that was reserved at withdraw() time.
                    $vault->increment('balance', $movement->amount);
                }
            }

            $movement->update(['status' => $newStatus]);

            return $movement->fresh();
        });

        // Outside the transaction — evaluation must not hold the row lock, and a fraud-logging
        // failure must never roll back a legitimate balance mutation.
        if ($movement && $newStatus === 'succeeded') {
            $this->fraudDetection->evaluate($movement);
        }

        return $movement;
    }

    /**
     * If the vault's most recent deposit/withdrawal is stuck `processing` and Yabeto can now
     * tell us what actually happened, resolve it before deposit()/withdraw()'s guard ever sees
     * it — turning "blocked forever until someone remembers to check" into "self-heals on the
     * very next attempt". Deliberately outside any lock/transaction (a live HTTP call has no
     * business holding a row lock); a still-genuinely-processing or unreachable-Yabeto outcome
     * just leaves the row as-is, and deposit()/withdraw() block exactly as before.
     */
    private function reconcileStuck(Vault $vault, string $type): void
    {
        if (! $this->yabeto->isEnabled()) {
            return;
        }

        $stuck = $vault->movements()
            ->where('type', $type)
            ->whereNotIn('status', YabetoStatus::TERMINAL)
            ->whereNotNull('yabeto_reference')
            ->first();

        if (! $stuck) {
            return;
        }

        // Deliberately catches everything, not just the two expected transport exceptions — this
        // is a best-effort pre-check ahead of a brand new deposit/withdraw attempt, and any
        // failure here (a malformed Yabeto response, an unexpected exception type) must never
        // crash that new attempt before it even reaches its own DB::transaction(). A prior stuck
        // movement silently blocking every future one this way would look exactly like "nothing
        // gets stored" from the outside, since the request never gets far enough to create a row.
        try {
            $result = $type === 'deposit'
                ? $this->yabeto->getPaymentIntent($stuck->yabeto_reference)
                : $this->yabeto->getDisbursement($stuck->yabeto_reference);
        } catch (\Throwable $e) {
            Log::warning('Vault reconcileStuck() pre-check failed, proceeding without it', [
                'message' => $e->getMessage(),
                'movement_id' => $stuck->id,
            ]);

            return;
        }

        if ($result->status !== 'processing') {
            $this->resolveMovementStatus($stuck->id, $result->status);
        }
    }
}
