<?php

namespace App\Services;

use App\Exceptions\VaultTransactionException;
use App\Models\Vault;
use App\Models\VaultMovement;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
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
    public function __construct(private readonly YabetoService $yabeto) {}

    /**
     * @return array{vault: Vault, movement: VaultMovement, message?: string}
     *
     * @throws VaultTransactionException if a deposit is already processing for this vault
     */
    public function deposit(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): array
    {
        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            if ($locked->movements()->where('type', 'deposit')->where('status', 'processing')->exists()) {
                throw new VaultTransactionException('Un dépôt est déjà en cours de confirmation.');
            }

            return $locked->movements()->create([
                'type' => 'deposit',
                'amount' => $amount,
                'note' => "Dépôt via {$methodLabel}.",
                'provider' => 'yabeto',
                'status' => 'processing',
            ]);
        });

        try {
            $intent = $this->yabeto->createPaymentIntent(
                (int) round($amount),
                'Dépôt coffre Elikia Fund',
                ['vault_id' => $vault->id, 'movement_id' => $movement->id],
            );

            $movement->update(['yabeto_reference' => $intent->id]);

            $result = $this->yabeto->confirmPaymentIntent(
                $intent->id,
                $intent->clientSecret ?? '',
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->user->name,
                '',
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
     */
    public function withdraw(Vault $vault, float $amount, string $paymentMethod, string $methodLabel, string $phone): array
    {
        $movement = DB::transaction(function () use ($vault, $amount, $methodLabel) {
            $locked = Vault::whereKey($vault->id)->lockForUpdate()->firstOrFail();

            if ($locked->movements()->where('type', 'withdraw')->where('status', 'processing')->exists()) {
                throw new VaultTransactionException('Un retrait est déjà en cours de confirmation.');
            }

            if ($amount > (float) $locked->balance) {
                throw new VaultTransactionException('Solde insuffisant.');
            }

            // Reserve the funds immediately, before Yabeto is even called — refunded by
            // resolveMovementStatus() if the payout ultimately fails. The previous code's comment
            // claimed this already happened; the code itself only decremented after a successful
            // Disbursement response, which this fixes.
            $locked->decrement('balance', $amount);

            return $locked->movements()->create([
                'type' => 'withdraw',
                'amount' => $amount,
                'note' => "Retrait via {$methodLabel}.",
                'provider' => 'yabeto',
                'status' => 'processing',
            ]);
        });

        try {
            $result = $this->yabeto->createDisbursement(
                (int) round($amount),
                $phone,
                YabetoService::OPERATOR_MAP[$paymentMethod],
                $vault->user->name,
                '',
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
        return DB::transaction(function () use ($movementId, $newStatus) {
            /** @var VaultMovement|null $movement */
            $movement = VaultMovement::where('id', $movementId)->lockForUpdate()->first();

            if (! $movement || $movement->status !== 'processing' || $movement->status === $newStatus) {
                return null;
            }

            $vault = Vault::whereKey($movement->vault_id)->lockForUpdate()->first();

            if ($vault) {
                if ($movement->type === 'deposit' && $newStatus === 'succeeded') {
                    $vault->increment('balance', $movement->amount);
                } elseif ($movement->type === 'withdraw' && $newStatus === 'failed') {
                    $vault->increment('balance', $movement->amount);
                }
            }

            $movement->update(['status' => $newStatus]);

            return $movement->fresh();
        });
    }
}
