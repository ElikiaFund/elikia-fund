<?php

namespace Tests\Feature\Vault;

use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * The mobile Mobile Money number used for a deposit/withdrawal was already collected and sent by
 * the app on every request — it just wasn't persisted onto the VaultMovement row. Covers both the
 * real-Yabeto path and the simulated fallback (Yabeto disabled, the default in tests/local dev),
 * since both create their own VaultMovement independently.
 */
class VaultMovementPhoneTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_simulated_deposit_stores_the_phone_number(): void
    {
        [$user, $company] = $this->activatedVault();
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/vault/deposit', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242 068166360',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertCreated();
        $this->assertSame('+242 068166360', $response->json('movement.phone'));
    }

    public function test_a_simulated_withdrawal_stores_the_phone_number(): void
    {
        [$user, $company, $vault] = $this->activatedVault(['balance' => 20000]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'airtel_money',
            'phone' => '+242 068166360',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertCreated();
        $this->assertSame('+242 068166360', $response->json('movement.phone'));
    }

    public function test_a_real_withdrawal_stores_the_phone_number_too(): void
    {
        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'test-secret-key', 'mode' => 'sandbox']);

        Http::fake([
            'pay.sandbox.yabetoopay.com/*' => Http::response(['id' => 'dis_test123', 'status' => 'processing']),
        ]);

        [$user, $company] = $this->activatedVault(['balance' => 20000]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242 068166360',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertStatus(202);
        $this->assertSame('+242 068166360', $response->json('movement.phone'));
    }

    /**
     * @return array{0: User, 1: Company, 2: Vault}
     */
    private function activatedVault(array $vaultAttributes = []): array
    {
        $user = User::factory()->create();
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        $vault = Vault::factory()->for($company)->create($vaultAttributes);

        return [$user, $company, $vault];
    }
}
