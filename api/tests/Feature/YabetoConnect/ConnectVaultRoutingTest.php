<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Phase A routing: only a KYC-approved Connect company moves money through its own connected
 * account; legacy companies and Connect companies still pending KYC stay on the plain flow.
 */
class ConnectVaultRoutingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        YabetoSetting::current()->update([
            'is_enabled' => true,
            'secret_key' => 'test-secret-key',
            'mode' => 'sandbox',
            'connect_enabled' => true,
            'connect_mode' => 'account',
            'default_application_fee_rate' => 2,
        ]);

        Http::fake([
            'pay.sandbox.yabetoopay.com/v1/payment-intents/*/confirm' => Http::response(['intentId' => 'pi_test', 'status' => 'processing']),
            'pay.sandbox.yabetoopay.com/v1/payment-intents' => Http::response(['id' => 'pi_test', 'clientSecret' => 'cs_test', 'status' => 'pending']),
            'pay.sandbox.yabetoopay.com/v1/connect/accounts/*/withdrawals' => Http::response([
                'id' => 'wd_test', 'object' => 'connect_withdrawal', 'amount' => 20000, 'currency' => 'xaf', 'status' => 'succeeded',
            ], 201),
            'pay.sandbox.yabetoopay.com/v1/disbursements' => Http::response(['id' => 'dis_test', 'status' => 'processing']),
        ]);
    }

    public function test_a_legacy_company_deposits_on_elikias_own_account(): void
    {
        [$user, $company] = $this->companyWithVault();

        $this->deposit($user, $company)->assertSuccessful();

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/payment-intents') && ! isset($r['on_behalf_of']));
    }

    public function test_an_approved_connect_company_deposits_on_behalf_of_its_own_account(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);

        $this->deposit($user, $company)->assertSuccessful();

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/payment-intents')
            && $r['on_behalf_of'] === 'acct_test'
            && (float) $r['application_fee_rate'] === 2.0);
    }

    public function test_a_connect_company_still_pending_kyc_cannot_move_money_at_all(): void
    {
        [$user, $company] = $this->companyWithVault();
        $company->update(['yabeto_account_id' => 'acct_test', 'yabeto_verification_status' => 'in_review']);

        $this->deposit($user, $company)
            ->assertForbidden()
            ->assertJsonPath('code', 'identity_verification_required')
            ->assertJsonPath('company_id', $company->id);
        $this->withdraw($user, $company, 20000)->assertForbidden();

        Http::assertNothingSent();
    }

    /** Provisioning failed at signup, so there's no account yet — still never the legacy flow. */
    public function test_a_company_marked_for_connect_without_an_account_is_locked_too(): void
    {
        [$user, $company] = $this->companyWithVault();
        $company->update(['yabeto_connect_required' => true]);

        $this->deposit($user, $company)->assertForbidden()->assertJsonPath('code', 'identity_verification_required');

        Http::assertNothingSent();
    }

    public function test_switching_connect_off_unlocks_pending_companies_onto_the_legacy_flow(): void
    {
        YabetoSetting::current()->update(['connect_enabled' => false]);
        [$user, $company] = $this->companyWithVault();
        $company->update(['yabeto_connect_required' => true, 'yabeto_account_id' => 'acct_test']);

        $this->deposit($user, $company)->assertSuccessful();

        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/payment-intents') && ! isset($r['on_behalf_of']));
    }

    public function test_a_partial_withdrawal_is_refused_for_a_connect_vault_before_any_network_call(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);

        $this->withdraw($user, $company, 5000)
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'totalité du solde'));

        Http::assertNothingSent();
        $this->assertSame(20000.0, (float) $company->vault->fresh()->balance);
    }

    public function test_a_full_withdrawal_uses_the_connect_payout_with_an_idempotency_key_and_no_amount(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);

        $this->withdraw($user, $company, 20000)->assertSuccessful();

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/connect/accounts/acct_test/withdrawals')
            && $r->hasHeader('Idempotency-Key')
            && ! isset($r['amount']));
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/disbursements'));
        $this->assertSame(0.0, (float) $company->vault->fresh()->balance);
    }

    /** @return array{0: User, 1: Company} */
    private function companyWithVault(bool $approved = false): array
    {
        $user = User::factory()->create(['name' => 'Ada Mabiala']);
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        Vault::factory()->for($company)->create(['balance' => 20000]);

        if ($approved) {
            $company->update([
                'yabeto_account_id' => 'acct_test',
                'yabeto_verification_status' => 'approved',
                'yabeto_capabilities' => ['resolved' => true, 'allowed_operations' => ['withdraw']],
            ]);
        }

        return [$user, $company->fresh()];
    }

    private function deposit(User $user, Company $company)
    {
        Sanctum::actingAs($user, ['*']);

        return $this->postJson('/api/vault/deposit', [
            'amount' => 10000, 'pin' => '1234', 'payment_method' => 'mtn_momo', 'phone' => '242068166360',
        ], ['X-Company-Id' => (string) $company->id]);
    }

    private function withdraw(User $user, Company $company, int $amount)
    {
        Sanctum::actingAs($user, ['*']);

        return $this->postJson('/api/vault/withdraw', [
            'amount' => $amount, 'pin' => '1234', 'payment_method' => 'mtn_momo', 'phone' => '242068166360',
        ], ['X-Company-Id' => (string) $company->id]);
    }
}
