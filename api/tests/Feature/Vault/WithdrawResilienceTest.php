<?php

namespace Tests\Feature\Vault;

use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use App\Services\Payment\YabetoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * VaultTransactionService::reconcileStuck() is a best-effort pre-check against a *prior* stuck
 * movement, run before a brand new deposit/withdraw attempt even starts its own DB::transaction().
 * The old narrow catch (only YabetoRequestException/ConnectionException) let any other exception
 * from that pre-check propagate and crash the request with a raw 500 — even though the correct,
 * expected outcome (a clean 409 "already in progress", since the stuck movement genuinely wasn't
 * resolved) doesn't require the pre-check to succeed at all. From the outside, a raw 500 on every
 * retry looked exactly like "withdrawals are broken / don't get stored" instead of the actual,
 * recoverable "one is already pending" business state.
 */
class WithdrawResilienceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_stuck_prior_withdrawal_returns_a_clean_conflict_instead_of_crashing_when_reconciling_it_fails(): void
    {
        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'test-secret-key', 'mode' => 'sandbox']);

        $user = User::factory()->create();
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        $vault = Vault::factory()->for($company)->create(['balance' => 20000]);

        // A previous withdrawal left stuck 'processing' with a reference — reconcileStuck() will
        // try to check on it before the new withdraw() attempt below even begins.
        $vault->movements()->create([
            'type' => 'withdraw',
            'amount' => 5000,
            'fee_amount' => 0,
            'provider_fee_amount' => 0,
            'platform_fee_amount' => 0,
            'net_amount' => 5000,
            'note' => 'Retrait précédent bloqué.',
            'provider' => 'yabeto',
            'status' => 'processing',
            'yabeto_reference' => 'dis_old_stuck',
        ]);

        $this->partialMock(YabetoService::class, function ($mock) {
            $mock->shouldReceive('isEnabled')->andReturn(true);
            // Simulates an unexpected failure mode (not YabetoRequestException/ConnectionException)
            // when checking the OLD stuck movement's status.
            $mock->shouldReceive('getDisbursement')->once()->andThrow(new \RuntimeException('Unexpected response shape'));
            // Never reached — the still-unresolved stuck movement correctly blocks a second
            // withdrawal from starting at all, exactly as it would if reconcileStuck() simply
            // hadn't run. This is what proves the fix is about not crashing, not about bypassing
            // the "one withdrawal at a time" business rule.
            $mock->shouldNotReceive('createDisbursement');
        });

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => 3000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242060000000',
        ], ['X-Company-Id' => (string) $company->id]);

        // A clean, expected business conflict — not an uncaught 500 from the uninvolved pre-check.
        $response->assertStatus(409);
        $response->assertJson(['message' => 'Un retrait est déjà en cours de confirmation.']);

        // Still just the one (untouched) stuck row — no crash, no duplicate, no silent data loss.
        $this->assertSame(1, $vault->movements()->where('type', 'withdraw')->count());
    }

    /** Same fragility, same fix, in the "Vérifier" button's own endpoint. */
    public function test_tapping_verifier_on_a_stuck_movement_stays_graceful_when_yabeto_fails_unexpectedly(): void
    {
        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'test-secret-key', 'mode' => 'sandbox']);

        $user = User::factory()->create();
        $company = Company::factory()->for($user)->create();
        $vault = Vault::factory()->for($company)->create(['balance' => 20000]);

        $movement = $vault->movements()->create([
            'type' => 'withdraw',
            'amount' => 5000,
            'fee_amount' => 0,
            'provider_fee_amount' => 0,
            'platform_fee_amount' => 0,
            'net_amount' => 5000,
            'note' => 'Retrait en attente.',
            'provider' => 'yabeto',
            'status' => 'processing',
            'yabeto_reference' => 'dis_pending_123',
        ]);

        $this->partialMock(YabetoService::class, function ($mock) {
            $mock->shouldReceive('getDisbursement')->once()->andThrow(new \RuntimeException('Unexpected response shape'));
        });

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson(
            "/api/vault/movements/{$movement->id}/refresh-status",
            [],
            ['X-Company-Id' => (string) $company->id],
        );

        $response->assertOk();
        $this->assertSame('processing', $response->json('status'));
    }
}
