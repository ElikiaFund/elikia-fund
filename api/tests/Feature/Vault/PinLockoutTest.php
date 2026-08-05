<?php

namespace Tests\Feature\Vault;

use App\Exceptions\VaultLockedException;
use App\Models\User;
use App\Models\Vault;
use App\Services\VaultSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers VaultSecurityService's lockout escalation (see the fee/security plan's Stage 2a): 5
 * failed PIN attempts lock the vault, a locked vault rejects even the correct PIN, and repeat
 * lockouts escalate (or decay back to tier 1) depending on how long ago the previous one was.
 * The escalation tests drive VaultSecurityService directly (not through the throttled
 * /vault/pin/verify or /vault/deposit HTTP routes) so Carbon::setTestNow() time travel can't be
 * confused with the rate limiter's own real-clock TTLs.
 */
class PinLockoutTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_five_failed_attempts_locks_the_vault(): void
    {
        $vault = Vault::factory()->for(User::factory())->activated()->create();
        $security = app(VaultSecurityService::class);

        for ($i = 1; $i <= 4; $i++) {
            $this->assertFalse($security->checkPin($vault, '0000'));
        }

        $this->assertSame(4, (int) $vault->fresh()->failed_pin_attempts);

        try {
            $security->checkPin($vault, '0000');
            $this->fail('Expected VaultLockedException on the 5th failed attempt.');
        } catch (VaultLockedException) {
            // Expected.
        }

        $fresh = $vault->fresh();
        $this->assertNotNull($fresh->locked_until);
        $this->assertTrue($fresh->locked_until->isFuture());
        $this->assertEqualsWithDelta(15, now()->diffInMinutes($fresh->locked_until), 1);
        $this->assertSame(1, (int) $fresh->lockout_count);
        // Reset alongside the lockout — a fresh lockout window starts clean.
        $this->assertSame(0, (int) $fresh->failed_pin_attempts);
    }

    public function test_a_locked_vault_rejects_even_the_correct_pin_over_http(): void
    {
        $user = User::factory()->create();
        $vault = Vault::factory()->for($user)->activated()->create(['balance' => 0]);
        Sanctum::actingAs($user, ['*']);

        for ($i = 1; $i <= 4; $i++) {
            $this->postJson('/api/vault/deposit', [
                'amount' => 1000,
                'pin' => '0000',
                'payment_method' => 'mtn_momo',
            ])->assertStatus(422);
        }

        // The 5th wrong attempt trips the lockout itself.
        $this->postJson('/api/vault/deposit', [
            'amount' => 1000,
            'pin' => '0000',
            'payment_method' => 'mtn_momo',
        ])->assertStatus(423);

        // A 6th attempt — this time with the CORRECT pin — must still be rejected while locked.
        // If checkPin() fell through to Hash::check() instead of short-circuiting on locked_until,
        // this would incorrectly succeed.
        $response = $this->postJson('/api/vault/deposit', [
            'amount' => 1000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ]);

        $response->assertStatus(423);
        $this->assertSame(0, (int) $vault->fresh()->failed_pin_attempts);
    }

    public function test_a_second_lockout_within_seven_days_doubles_the_duration(): void
    {
        $vault = Vault::factory()->for(User::factory())->activated()->create();
        $security = app(VaultSecurityService::class);

        $this->triggerLockout($security, $vault);
        $first = $vault->fresh();
        $this->assertSame(1, (int) $first->lockout_count);

        // Past the first lockout's 15-minute expiry, still well within the 7-day decay window.
        Carbon::setTestNow(Carbon::now()->addMinutes(20));

        $this->triggerLockout($security, $vault);
        $second = $vault->fresh();

        $this->assertSame(2, (int) $second->lockout_count);
        $this->assertEqualsWithDelta(30, Carbon::now()->diffInMinutes($second->locked_until), 1);
    }

    public function test_a_lockout_more_than_seven_days_later_resets_to_tier_one(): void
    {
        $vault = Vault::factory()->for(User::factory())->activated()->create();
        $security = app(VaultSecurityService::class);

        $this->triggerLockout($security, $vault);
        $first = $vault->fresh();
        $this->assertSame(1, (int) $first->lockout_count);

        Carbon::setTestNow($first->lockout_count_reset_at->copy()->addDay());

        $this->triggerLockout($security, $vault);
        $second = $vault->fresh();

        $this->assertSame(1, (int) $second->lockout_count);
        $this->assertEqualsWithDelta(15, Carbon::now()->diffInMinutes($second->locked_until), 1);
    }

    /** Drives 5 failed attempts against an already-unlocked vault, ending in a fresh lockout. */
    private function triggerLockout(VaultSecurityService $security, Vault $vault): void
    {
        for ($i = 1; $i <= 4; $i++) {
            $security->checkPin($vault, '0000');
        }

        try {
            $security->checkPin($vault, '0000');
        } catch (VaultLockedException) {
            // Expected on the 5th attempt.
        }
    }
}
