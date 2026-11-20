<?php

namespace App\Services;

use App\Exceptions\FeeException;
use App\Exceptions\VaultTransactionException;
use App\Models\Vault;
use App\Models\VaultMovement;
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
    /** Marks Connect payouts, which are reconciled by replay rather than by disbursement lookup. */
    public const CONNECT_PROVIDER = 'yabeto_connect';

    public function __construct(
        private readonly YabetoService $yabeto,
        private readonly YabetoConnectClient $connectClient,
        private readonly YabetoConnectGate $connectGate,
        private readonly FeeService $fees,
        private readonly VaultFraudDetectionService $fraudDetection,
    ) {}

    /** KYC-approved Connect company → its own connected account. See YabetoConnectGate. */
    public function shouldUseConnect(Vault $vault): bool
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

        $viaConnect = $this->shouldUseConnect($vault);
        $fee = $this->fees->deposit($amount, $viaConnect);

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
            // Connect merchants deposit `on_behalf_of` their own connected account, so the funds
            // land on *their* Yabeto balance, not Elikia's. Legacy merchants keep the old path.
            if ($viaConnect) {
                $intent = $this->yabeto->createPaymentIntentOnBehalfOf(
                    (int) round($amount),
                    $vault->company->yabeto_account_id,
                    $this->fees->applicationFeeRate($fee, $amount),
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

        $fee = $this->fees->withdrawal($amount);

        $movement = DB::transaction(function () use ($vault, $amount, $fee, $methodLabel, $phone) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            if ($locked->movements()->where('type', 'withdraw')->whereNotIn('status', YabetoStatus::NOT_IN_FLIGHT)->exists()) {
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
            // Disbursement pays out the NET amount — the vault above was already debited the full
            // gross amount the user asked to withdraw; the difference is the fee.
            $result = $this->yabeto->createDisbursement(
                (int) round($fee['net_amount']),
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->company->user->name,
            );

            $movement->update(['yabeto_reference' => $result->id]);
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
     * A verified merchant's money sits on their own Yabeto Connect account, where new credits
     * mature before they can be paid out (7 days by default). The vault shows these figures so
     * the merchant knows what can be withdrawn now. Null when Yabeto can't be reached.
     *
     * @return array{available: float, pending: float, held: float, next_maturity_at: ?string}|null
     */
    public function connectBalances(Vault $vault): ?array
    {
        try {
            $balance = $this->connectClient->getAccount($vault->company->yabeto_account_id)->balanceFor('xaf');
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto Connect balance read failed', ['vault_id' => $vault->id, 'message' => $e->getMessage()]);

            return null;
        }

        return [
            'available' => (float) ($balance['balance'] ?? 0),
            'pending' => (float) ($balance['pending_balance'] ?? 0),
            'held' => (float) ($balance['held_balance'] ?? 0),
            'next_maturity_at' => $balance['next_maturity_at'] ?? null,
        ];
    }

    /**
     * Pays a verified merchant's *available* Yabeto balance out to the mobile money number they
     * registered during KYC. Connect payouts are all-or-nothing and only cover matured funds, so
     * the amount is Yabeto's, not the vault's: the caller must ask for exactly what is available
     * (shown in the app) — anything else is refused rather than paying out a surprise amount.
     * No fee: Yabeto charges none on Connect payouts and Elikia can't withhold one.
     *
     * @return array{vault: Vault, movement: VaultMovement, message?: string}
     *
     * @throws VaultTransactionException when nothing has matured yet, the amount doesn't match,
     *                                   or a payout is already in flight
     */
    public function withdrawViaConnect(Vault $vault, float $requestedAmount): array
    {
        $this->replayStuckConnectWithdrawal($vault);

        $balances = $this->connectBalances($vault)
            ?? throw new VaultTransactionException('Impossible de joindre Yabeto pour vérifier le montant disponible. Réessayez dans un instant.');
        $available = $balances['available'];

        if ($available <= 0) {
            throw new VaultTransactionException(
                "Aucun montant n'est encore disponible au retrait : vos derniers versements sont en période de maturation chez Yabeto."
            );
        }

        if (abs($requestedAmount - $available) >= 1) {
            throw new VaultTransactionException(sprintf(
                'Avec un compte vérifié, un retrait porte sur la totalité du montant disponible (%s FCFA). '
                .'Redéposez ensuite ce que vous souhaitez garder en épargne.',
                number_format($available, 0, ',', ' '),
            ));
        }

        $fee = $this->fees->withdrawal($available, viaConnect: true);

        $movement = DB::transaction(function () use ($vault, $available, $fee) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            // Unlike a legacy withdrawal, a Connect payout under review still blocks: payouts take
            // everything available on the merchant's Yabeto account, so a new one could pay out
            // the very funds support is still checking.
            if ($locked->movements()->where('type', 'withdraw')->whereNotIn('status', YabetoStatus::TERMINAL)->exists()) {
                throw new VaultTransactionException('Un retrait est déjà en cours de confirmation ou de vérification par notre équipe.');
            }

            // Reserved up front like a legacy withdrawal; refunded by resolveMovementStatus() if
            // the payout fails.
            $locked->decrement('balance', $available);

            return $locked->movements()->create([
                'type' => 'withdraw',
                'amount' => $available,
                'fee_amount' => $fee['fee_amount'],
                'provider_fee_amount' => $fee['provider_fee_amount'],
                'platform_fee_amount' => $fee['platform_fee_amount'],
                'net_amount' => $fee['net_amount'],
                'note' => 'Retrait vers votre numéro Mobile Money enregistré auprès de Yabeto.',
                'provider' => self::CONNECT_PROVIDER,
                'status' => 'processing',
            ]);
        });

        return $this->completeConnectWithdrawal($vault, $movement);
    }

    /**
     * Re-sends an interrupted Connect payout with its original Idempotency-Key: within Yabeto's
     * 24h window that returns the original outcome instead of paying twice. Used before a new
     * withdrawal and by payments:reconcile-pending.
     */
    public function replayConnectWithdrawal(VaultMovement $movement): ?VaultMovement
    {
        $movement->loadMissing('vault.company');

        return $this->completeConnectWithdrawal($movement->vault, $movement)['movement'] ?? null;
    }

    /** @return array{vault: Vault, movement: VaultMovement, message?: string} */
    private function completeConnectWithdrawal(Vault $vault, VaultMovement $movement): array
    {
        try {
            $payout = $this->connectClient->withdraw($vault->company->yabeto_account_id, "vault_withdraw:movement:{$movement->id}");
        } catch (YabetoRequestException|ConnectionException $e) {
            Log::warning('Yabeto Connect withdrawal request failed', ['message' => $e->getMessage(), 'movement_id' => $movement->id]);

            return [
                'vault' => $vault->fresh(),
                'movement' => $movement->fresh(),
                'message' => 'Votre retrait est en cours de traitement. Contactez le support s\'il ne se confirme pas rapidement.',
            ];
        }

        DB::transaction(function () use ($movement, $payout) {
            $movement->update(['yabeto_reference' => $payout->id]);

            // Funds can mature between our balance read and the payout, so Yabeto may pay a little
            // more (or less) than reserved: align the vault and movement with what was really paid.
            $difference = round((float) $movement->amount - $payout->amount, 2);

            if ($payout->isSuccessful() && $difference !== 0.0) {
                Vault::whereKey($movement->vault_id)->lockForUpdate()->first()?->increment('balance', $difference);
                $movement->update(['amount' => $payout->amount, 'net_amount' => $payout->amount]);
            }
        });

        $resolved = $this->resolveMovementStatus($movement->id, $payout->isSuccessful() ? 'succeeded' : 'failed') ?? $movement->fresh();

        return array_filter([
            'vault' => $vault->fresh(),
            'movement' => $resolved,
            'message' => $payout->isSuccessful() ? null : "L'opérateur Mobile Money a refusé le versement. Votre solde a été rétabli.",
        ], fn ($value) => $value !== null);
    }

    private function replayStuckConnectWithdrawal(Vault $vault): void
    {
        $stuck = $vault->movements()
            ->where('type', 'withdraw')
            ->where('provider', self::CONNECT_PROVIDER)
            ->whereNotIn('status', YabetoStatus::NOT_IN_FLIGHT)
            ->first();

        if ($stuck) {
            $this->replayConnectWithdrawal($stuck);
        }
    }

    /**
     * Parks a withdrawal Yabeto can't confirm either way. Auto-failing it would refund the vault
     * even though the payout may have gone through — paying the merchant twice from Elikia's
     * account — so the money stays reserved and support decides (settleReview()). Null if the
     * movement already has an outcome or is already flagged.
     */
    public function flagForReview(VaultMovement $movement, string $reason): ?VaultMovement
    {
        $flagged = DB::transaction(function () use ($movement, $reason) {
            /** @var VaultMovement|null $locked */
            $locked = VaultMovement::whereKey($movement->id)->lockForUpdate()->first();

            if (! $locked || $locked->type !== 'withdraw' || ! YabetoStatus::isPending($locked->status) || $locked->status === YabetoStatus::NEEDS_REVIEW) {
                return null;
            }

            $locked->update(['status' => YabetoStatus::NEEDS_REVIEW, 'review_reason' => $reason]);

            return $locked->fresh();
        });

        if ($flagged) {
            Log::warning('Withdrawal flagged for manual review — Yabeto could not confirm it', [
                'movement_id' => $flagged->id,
                'vault_id' => $flagged->vault_id,
                'amount' => (float) $flagged->amount,
                'yabeto_reference' => $flagged->yabeto_reference,
                'reason' => $reason,
            ]);
        }

        return $flagged;
    }

    /**
     * Support's verdict on a flagged withdrawal, after checking Yabeto's dashboard: `succeeded`
     * keeps the reserved money out of the vault, `failed` refunds it. Records who and why.
     *
     * @param  'succeeded'|'failed'  $outcome
     *
     * @throws VaultTransactionException if the movement isn't awaiting review any more
     */
    public function settleReview(VaultMovement $movement, string $outcome, int $reviewerId, ?string $note): VaultMovement
    {
        $settled = DB::transaction(function () use ($movement, $outcome, $reviewerId, $note) {
            /** @var VaultMovement $locked */
            $locked = VaultMovement::whereKey($movement->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== YabetoStatus::NEEDS_REVIEW) {
                throw new VaultTransactionException("Ce retrait n'est plus en attente de vérification.");
            }

            if ($outcome === 'failed') {
                Vault::whereKey($locked->vault_id)->lockForUpdate()->firstOrFail()->increment('balance', $locked->amount);
            }

            $locked->update([
                'status' => $outcome,
                'reviewed_by_user_id' => $reviewerId,
                'reviewed_at' => now(),
                'review_note' => $note,
            ]);

            return $locked->fresh();
        });

        // Same as every other path that confirms a withdrawal (see resolveMovementStatus()).
        if ($outcome === 'succeeded') {
            $this->fraudDetection->evaluate($settled);
        }

        return $settled;
    }

    /**
     * The only place a movement's balance side-effect is ever applied — deposits credit the vault
     * exactly once on the succeeded transition; withdrawals (already debited eagerly at
     * withdraw() time) refund exactly once on a failed/expired/canceled transition. Locked so a webhook delivery
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

            // A flagged withdrawal only leaves review for a real outcome — a "still processing"
            // answer must not quietly put it back in flight.
            if ($movement->status === YabetoStatus::NEEDS_REVIEW && YabetoStatus::isPending($newStatus)) {
                return null;
            }

            $vault = Vault::whereKey($movement->vault_id)->lockForUpdate()->first();

            if ($vault) {
                if ($movement->type === 'deposit' && $newStatus === 'succeeded') {
                    // Credit only the post-fee amount — the gap between gross (what Yabeto
                    // collected) and net (what actually lands in the vault) is the fee.
                    $vault->increment('balance', $movement->net_amount);
                } elseif ($movement->type === 'withdraw' && in_array($newStatus, YabetoStatus::FAILURES, true)) {
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
            ->where('provider', 'yabeto')
            ->whereNotIn('status', YabetoStatus::NOT_IN_FLIGHT)
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
