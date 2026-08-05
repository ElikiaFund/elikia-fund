<?php

namespace App\Services;

use App\Exceptions\VaultLockedException;
use App\Models\Vault;
use App\Models\VaultSecurityEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Owns PIN verification + lockout escalation for the vault — every Hash::check(pin, pin_hash)
 * call site in VaultController goes through here instead, so the lockout policy lives in one
 * place. Never mutates failed_pin_attempts/locked_until/lockout_count via mass assignment
 * (mirrors pin_hash's own discipline) — always forceFill, always saved immediately.
 */
class VaultSecurityService
{
    private const MAX_ATTEMPTS = 5;

    private const BASE_LOCKOUT_MINUTES = 15;

    private const MAX_LOCKOUT_MINUTES = 24 * 60;

    private const LOCKOUT_DECAY_DAYS = 7;

    public function __construct(private readonly PaymentNotificationService $paymentNotifications) {}

    /**
     * @return bool true if the PIN is correct, false if incorrect (and not yet locked).
     *
     * @throws VaultLockedException if the vault was already locked, or this attempt just locked it.
     */
    public function checkPin(Vault $vault, string $pin): bool
    {
        if ($vault->locked_until?->isFuture()) {
            throw new VaultLockedException($this->lockedMessage($vault->locked_until));
        }

        if (Hash::check($pin, $vault->pin_hash)) {
            if ($vault->failed_pin_attempts > 0) {
                $vault->forceFill(['failed_pin_attempts' => 0])->save();
            }

            return true;
        }

        $this->recordFailedAttempt($vault);

        if ($vault->locked_until?->isFuture()) {
            throw new VaultLockedException($this->lockedMessage($vault->locked_until));
        }

        return false;
    }

    public function logActivated(Vault $vault): void
    {
        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $vault->user_id,
            'type' => 'activated',
        ]);
    }

    private function recordFailedAttempt(Vault $vault): void
    {
        $attempts = $vault->failed_pin_attempts + 1;

        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $vault->user_id,
            'type' => 'pin_failed',
            'metadata' => ['attempt' => $attempts],
        ]);

        if ($attempts < self::MAX_ATTEMPTS) {
            $vault->forceFill(['failed_pin_attempts' => $attempts])->save();

            return;
        }

        // Escalates each time a new lockout is triggered within LOCKOUT_DECAY_DAYS of the
        // previous one; otherwise resets back to tier 1 — a lockout long enough ago shouldn't
        // be held against the account forever.
        $tier = $vault->lockout_count_reset_at?->isFuture() ? $vault->lockout_count + 1 : 1;
        $minutes = min(self::BASE_LOCKOUT_MINUTES * (2 ** ($tier - 1)), self::MAX_LOCKOUT_MINUTES);

        $vault->forceFill([
            'failed_pin_attempts' => 0,
            'locked_until' => now()->addMinutes($minutes),
            'lockout_count' => $tier,
            'lockout_count_reset_at' => now()->addDays(self::LOCKOUT_DECAY_DAYS),
        ])->save();

        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $vault->user_id,
            'type' => 'pin_locked',
            'metadata' => ['minutes' => $minutes, 'lockout_tier' => $tier],
        ]);

        $this->paymentNotifications->vaultLocked($vault->user, $minutes);
    }

    private function lockedMessage(Carbon $lockedUntil): string
    {
        $minutes = max(1, (int) now()->diffInMinutes($lockedUntil, false));

        return "Coffre verrouillé suite à plusieurs codes PIN incorrects. Réessayez dans {$minutes} minute(s).";
    }
}
