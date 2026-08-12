<?php

namespace Tests\Feature\Vault;

use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Proves the vault's two-part isolation model: the balance/history is isolated per company
 * (mirrors Company\DataIsolationTest's pattern for transactions), while the PIN itself is
 * isolated per *user*, deliberately shared across every company vault that user can reach.
 */
class VaultCompanyIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_deposit_into_one_companys_vault_never_touches_another(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();

        $companyA = Company::factory()->for($user)->create();
        $companyB = Company::factory()->for($user)->create();
        Vault::factory()->for($companyA)->create(['balance' => 0]);
        Vault::factory()->for($companyB)->create(['balance' => 5000]);

        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/vault/deposit', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ], ['X-Company-Id' => (string) $companyA->id])->assertCreated();

        $responseA = $this->getJson('/api/vault', ['X-Company-Id' => (string) $companyA->id]);
        $responseB = $this->getJson('/api/vault', ['X-Company-Id' => (string) $companyB->id]);

        $this->assertGreaterThan(0, (float) $responseA->json('balance'));
        $this->assertEqualsWithDelta(5000, (float) $responseB->json('balance'), 0.01);
    }

    public function test_a_missing_x_company_id_header_is_rejected_on_vault_routes(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/vault');

        $response->assertStatus(400);
    }

    public function test_a_pin_lockout_on_one_companys_vault_blocks_every_other_company_too(): void
    {
        $user = User::factory()->create();
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();

        $companyA = Company::factory()->for($user)->create();
        $companyB = Company::factory()->for($user)->create();
        Vault::factory()->for($companyA)->create();
        Vault::factory()->for($companyB)->create();

        Sanctum::actingAs($user, ['*']);

        for ($i = 1; $i <= 5; $i++) {
            $this->postJson('/api/vault/deposit', [
                'amount' => 1000,
                'pin' => '0000',
                'payment_method' => 'mtn_momo',
            ], ['X-Company-Id' => (string) $companyA->id]);
        }

        // Locked out via company A's vault — the correct PIN against company B must still be
        // rejected, since the lockout lives on the user, not the vault.
        $response = $this->postJson('/api/vault/deposit', [
            'amount' => 1000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ], ['X-Company-Id' => (string) $companyB->id]);

        $response->assertStatus(423);
    }
}
