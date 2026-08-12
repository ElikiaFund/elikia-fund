<?php

namespace Tests\Feature\Vault;

use App\Exceptions\VaultLockedException;
use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use App\Services\VaultSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers VaultSecurityService's lockout escalation: 5 failed PIN attempts lock the user (not the
 * vault — the PIN is a per-user property, shared across every company vault they can reach), a
 * locked user rejects even the correct PIN, and repeat lockouts escalate (or decay back to tier
 * 1) depending on how long ago the previous one was. The escalation tests drive
 * VaultSecurityService directly (not through the throttled /vault/pin/verify or /vault/deposit
 * HTTP routes) so Carbon::setTestNow() time travel can't be confused with the rate limiter's own
 * real-clock TTLs.
 */
class PinLockoutTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_five_failed_attempts_locks_the_user(): void
    {
        $user = User::factory()->create();
        $vault = $this->activatedVaultFor($user);
        $security = app(VaultSecurityService::class);

        for ($i = 1; $i <= 4; $i++) {
            $this->assertFalse($security->checkPin($user, $vault, '0000'));
        }

        $this->assertSame(4, (int) $user->fresh()->failed_pin_attempts);

        try {
            $security->checkPin($user, $vault, '0000');
            $this->fail('Expected VaultLockedException on the 5th failed attempt.');
        } catch (VaultLockedException) {
            // Expected.
        }

        $fresh = $user->fresh();
        $this->assertNotNull($fresh->locked_until);
        $this->assertTrue($fresh->locked_until->isFuture());
        $this->assertEqualsWithDelta(15, now()->diffInMinutes($fresh->locked_until), 1);
        $this->assertSame(1, (int) $fresh->lockout_count);
        // Reset alongside the lockout — a fresh lockout window starts clean.
        $this->assertSame(0, (int) $fresh->failed_pin_attempts);
    }

    public function test_a_locked_user_rejects_even_the_correct_pin_over_http(): void
    {
        $user = User::factory()->create();
        $company = Company::factory()->for($user)->create();
        Vault::factory()->for($company)->create(['balance' => 0]);
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        Sanctum::actingAs($user, ['*']);

        for ($i = 1; $i <= 4; $i++) {
            $this->postJson('/api/vault/deposit', [
                'amount' => 1000,
                'pin' => '0000',
                'payment_method' => 'mtn_momo',
            ], ['X-Company-Id' => (string) $company->id])->assertStatus(422);
        }

        // The 5th wrong attempt trips the lockout itself.
        $this->postJson('/api/vault/deposit', [
            'amount' => 1000,
            'pin' => '0000',
            'payment_method' => 'mtn_momo',
        ], ['X-Company-Id' => (string) $company->id])->assertStatus(423);

        // A 6th attempt — this time with the CORRECT pin — must still be rejected while locked.
        // If checkPin() fell through to Hash::check() instead of short-circuiting on locked_until,
        // this would incorrectly succeed.
        $response = $this->postJson('/api/vault/deposit', [
            'amount' => 1000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertStatus(423);
        $this->assertSame(0, (int) $user->fresh()->failed_pin_attempts);
    }

    public function test_a_second_lockout_within_seven_days_doubles_the_duration(): void
    {
        $user = User::factory()->create();
        $vault = $this->activatedVaultFor($user);
        $security = app(VaultSecurityService::class);

        $this->triggerLockout($security, $user, $vault);
        $first = $user->fresh();
        $this->assertSame(1, (int) $first->lockout_count);

        // Past the first lockout's 15-minute expiry, still well within the 7-day decay window.
        Carbon::setTestNow(Carbon::now()->addMinutes(20));

        $this->triggerLockout($security, $user, $vault);
        $second = $user->fresh();

        $this->assertSame(2, (int) $second->lockout_count);
        $this->assertEqualsWithDelta(30, Carbon::now()->diffInMinutes($second->locked_until), 1);
    }

    public function test_a_lockout_more_than_seven_days_later_resets_to_tier_one(): void
    {
        $user = User::factory()->create();
        $vault = $this->activatedVaultFor($user);
        $security = app(VaultSecurityService::class);

        $this->triggerLockout($security, $user, $vault);
        $first = $user->fresh();
        $this->assertSame(1, (int) $first->lockout_count);

        Carbon::setTestNow($first->lockout_count_reset_at->copy()->addDay());

        $this->triggerLockout($security, $user, $vault);
        $second = $user->fresh();

        $this->assertSame(1, (int) $second->lockout_count);
        $this->assertEqualsWithDelta(15, Carbon::now()->diffInMinutes($second->locked_until), 1);
    }

    /** Creates a company + vault for $user and gives $user a shared PIN of '1234'. */
    private function activatedVaultFor(User $user): Vault
    {
        $company = Company::factory()->for($user)->create();
        $vault = Vault::factory()->for($company)->create();

        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();

        return $vault;
    }

    /** Drives 5 failed attempts against an already-unlocked user, ending in a fresh lockout. */
    private function triggerLockout(VaultSecurityService $security, User $user, Vault $vault): void
    {
        for ($i = 1; $i <= 4; $i++) {
            $security->checkPin($user, $vault, '0000');
        }

        try {
            $security->checkPin($user, $vault, '0000');
        } catch (VaultLockedException) {
            // Expected on the 5th attempt.
        }
    }
}
