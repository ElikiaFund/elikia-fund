<?php

namespace App\Services;

use App\Exceptions\VaultLockedException;
use App\Models\User;
use App\Models\Vault;
use App\Models\VaultSecurityEvent;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

/**
 * Owns PIN verification + lockout escalation for the vault — every Hash::check(pin, pin_hash)
 * call site in VaultController goes through here instead, so the lockout policy lives in one
 * place. The PIN and its lockout state belong to the User, not the Vault (deliberately — one
 * shared PIN across every company vault a person can reach, a foundation for a later feature
 * where several users on one company each use their own PIN against that company's shared
 * vault) — but every security event still logs against the specific Vault it was attempted on.
 * Never mutates failed_pin_attempts/locked_until/lockout_count via mass assignment (mirrors
 * pin_hash's own discipline) — always forceFill, always saved immediately.
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
     * @throws VaultLockedException if the user was already locked, or this attempt just locked them.
     */
    public function checkPin(User $user, Vault $vault, string $pin): bool
    {
        if ($user->locked_until?->isFuture()) {
            throw new VaultLockedException($this->lockedMessage($user->locked_until));
        }

        if (Hash::check($pin, $user->pin_hash)) {
            if ($user->failed_pin_attempts > 0) {
                $user->forceFill(['failed_pin_attempts' => 0])->save();
            }

            return true;
        }

        $this->recordFailedAttempt($user, $vault);

        if ($user->locked_until?->isFuture()) {
            throw new VaultLockedException($this->lockedMessage($user->locked_until));
        }

        return false;
    }

    public function logActivated(Vault $vault, User $user): void
    {
        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $user->id,
            'type' => 'activated',
        ]);
    }

    private function recordFailedAttempt(User $user, Vault $vault): void
    {
        $attempts = $user->failed_pin_attempts + 1;

        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $user->id,
            'type' => 'pin_failed',
            'metadata' => ['attempt' => $attempts],
        ]);

        if ($attempts < self::MAX_ATTEMPTS) {
            $user->forceFill(['failed_pin_attempts' => $attempts])->save();

            return;
        }

        // Escalates each time a new lockout is triggered within LOCKOUT_DECAY_DAYS of the
        // previous one; otherwise resets back to tier 1 — a lockout long enough ago shouldn't
        // be held against the account forever.
        $tier = $user->lockout_count_reset_at?->isFuture() ? $user->lockout_count + 1 : 1;
        $minutes = min(self::BASE_LOCKOUT_MINUTES * (2 ** ($tier - 1)), self::MAX_LOCKOUT_MINUTES);

        $user->forceFill([
            'failed_pin_attempts' => 0,
            'locked_until' => now()->addMinutes($minutes),
            'lockout_count' => $tier,
            'lockout_count_reset_at' => now()->addDays(self::LOCKOUT_DECAY_DAYS),
        ])->save();

        VaultSecurityEvent::create([
            'vault_id' => $vault->id,
            'user_id' => $user->id,
            'type' => 'pin_locked',
            'metadata' => ['minutes' => $minutes, 'lockout_tier' => $tier],
        ]);

        $this->paymentNotifications->vaultLocked($user, $minutes);
    }

    private function lockedMessage(Carbon $lockedUntil): string
    {
        $minutes = max(1, (int) now()->diffInMinutes($lockedUntil, false));

        return "Coffre verrouillé suite à plusieurs codes PIN incorrects. Réessayez dans {$minutes} minute(s).";
    }
}
