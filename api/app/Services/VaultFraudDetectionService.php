<?php

namespace App\Services;

use App\Models\VaultMovement;
use App\Models\VaultSecurityEvent;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Flags suspicious vault deposits/withdrawals for staff review — v1 is deliberately
 * flag-and-notify-staff only, never auto-block, never notify the flagged user (surfacing this to
 * the account holder could tip off a bad actor, or needlessly alarm a legitimate one). Tontine
 * payouts are out of scope: a payout is an owner-triggered disbursement into someone else's
 * vault, a different trust model than a user moving their own money.
 *
 * The three thresholds below are hardcoded, not part of the admin-configurable `fees` setting —
 * they're the kind of number retuned after looking at real fraud data over time, not something a
 * non-technical admin should blind-guess via a form on day one.
 */
class VaultFraudDetectionService
{
    private const UNUSUAL_AMOUNT_MULTIPLIER = 5;

    private const UNUSUAL_AMOUNT_FLOOR = 20000;

    private const VELOCITY_WINDOW_MINUTES = 60;

    private const VELOCITY_THRESHOLD = 4;

    private const RAPID_CYCLING_WINDOW_MINUTES = 30;

    /**
     * Never throws — a fraud-detection bug must never break a real deposit/withdrawal
     * confirmation. Writes at most one flagged_transaction event per movement, listing every
     * rule that fired in metadata.reasons.
     */
    public function evaluate(VaultMovement $movement): void
    {
        if (! in_array($movement->type, ['deposit', 'withdraw'], true)) {
            return;
        }

        try {
            $reasons = array_values(array_filter([
                $this->unusualAmount($movement) ? 'unusual_amount' : null,
                $this->velocity($movement) ? 'velocity' : null,
                $movement->type === 'withdraw' && $this->rapidCycling($movement) ? 'rapid_cycling' : null,
            ]));

            if ($reasons === []) {
                return;
            }

            VaultSecurityEvent::create([
                'vault_id' => $movement->vault_id,
                'user_id' => $movement->vault->user_id,
                'type' => 'flagged_transaction',
                'vault_movement_id' => $movement->id,
                'metadata' => ['reasons' => $reasons],
            ]);
        } catch (Throwable $e) {
            Log::warning('Vault fraud detection failed', ['message' => $e->getMessage(), 'movement_id' => $movement->id]);
        }
    }

    private function unusualAmount(VaultMovement $movement): bool
    {
        $average = (float) VaultMovement::where('vault_id', $movement->vault_id)
            ->whereIn('type', ['deposit', 'withdraw'])
            ->whereIn('status', ['succeeded', 'completed'])
            ->where('id', '!=', $movement->id)
            ->avg('amount');

        $threshold = max($average * self::UNUSUAL_AMOUNT_MULTIPLIER, self::UNUSUAL_AMOUNT_FLOOR);

        return (float) $movement->amount > $threshold;
    }

    private function velocity(VaultMovement $movement): bool
    {
        $count = VaultMovement::where('vault_id', $movement->vault_id)
            ->whereIn('type', ['deposit', 'withdraw'])
            ->where('created_at', '>=', now()->subMinutes(self::VELOCITY_WINDOW_MINUTES))
            ->count();

        return $count > self::VELOCITY_THRESHOLD;
    }

    private function rapidCycling(VaultMovement $movement): bool
    {
        return VaultMovement::where('vault_id', $movement->vault_id)
            ->where('type', 'deposit')
            ->whereIn('status', ['succeeded', 'completed'])
            ->where('id', '!=', $movement->id)
            ->where('created_at', '>=', now()->subMinutes(self::RAPID_CYCLING_WINDOW_MINUTES))
            ->exists();
    }
}
