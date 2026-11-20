<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use App\Services\VaultTransactionService;
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
            'connect_mode' => 'platform',
        ]);

        Http::fake([
            'pay.sandbox.yabetoopay.com/v1/payment-intents/*/confirm' => Http::response(['intentId' => 'pi_test', 'status' => 'processing']),
            'pay.sandbox.yabetoopay.com/v1/payment-intents' => Http::response(['id' => 'pi_test', 'clientSecret' => 'cs_test', 'status' => 'pending']),
            'pay.sandbox.yabetoopay.com/v1/connect/accounts/*/withdrawals' => Http::response([
                'id' => 'wd_test', 'object' => 'connect_withdrawal', 'amount' => 15000, 'currency' => 'xaf', 'status' => 'succeeded',
            ], 201),
            // 15 000 matured and withdrawable, 5 000 still maturing — the vault ledger holds 20 000.
            'pay.sandbox.yabetoopay.com/v1/connect/accounts/acct_test' => Http::response([
                'id' => 'acct_test', 'object' => 'connect_account', 'status' => 'active',
                'balances' => [['currency' => 'xaf', 'balance' => 15000, 'pending_balance' => 5000, 'held_balance' => 0, 'next_maturity_at' => '2026-10-23T00:00:00.000Z']],
            ]),
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
            // Elikia's default deposit fee (0.5 % + 75) on 10 000 = 125, i.e. 1.25 % of this charge.
            && (float) $r['application_fee_rate'] === 1.25);

        // Yabeto's Connect fee (3.5 % + 1 % + 25 = 475) and Elikia's 125 come off the gross.
        $this->assertDatabaseHas('vault_movements', ['type' => 'deposit', 'provider_fee_amount' => 475, 'platform_fee_amount' => 125, 'net_amount' => 9400]);
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

    /**
     * Rolling Connect back must not let a verified merchant withdraw from Elikia's own account
     * while their real money still sits on their connected account (paying twice).
     */
    public function test_a_connect_company_cannot_withdraw_through_the_legacy_flow_after_a_rollback(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);
        YabetoSetting::current()->update(['connect_enabled' => false]);

        $this->withdraw($user, $company, 5000)
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'suspendus'));

        Http::assertNothingSent();
        $this->assertSame(20000.0, (float) $company->vault->fresh()->balance);
    }

    public function test_a_legacy_company_cannot_start_identity_verification_itself(): void
    {
        [$user, $company] = $this->companyWithVault();
        Sanctum::actingAs($user, ['*']);

        $this->postJson("/api/companies/{$company->id}/yabeto-connect/onboarding-link")->assertStatus(422);

        Http::assertNothingSent();
        $this->assertNull($company->fresh()->yabeto_account_id);
    }

    public function test_the_vault_shows_what_is_available_now_and_what_is_still_maturing(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);
        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/vault', ['X-Company-Id' => (string) $company->id])
            ->assertOk()
            ->assertJsonPath('balance', '20000.00')
            ->assertJsonPath('connect.available', 15000)
            ->assertJsonPath('connect.pending', 5000)
            ->assertJsonPath('connect.next_maturity_at', '2026-10-23T00:00:00.000Z');
    }

    public function test_a_legacy_vault_has_no_connect_balances(): void
    {
        [$user, $company] = $this->companyWithVault();
        Sanctum::actingAs($user, ['*']);

        $this->getJson('/api/vault', ['X-Company-Id' => (string) $company->id])->assertOk()->assertJsonPath('connect', null);
    }

    public function test_a_connect_withdrawal_must_ask_for_exactly_the_available_amount(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);

        $this->withdraw($user, $company, 20000)
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'totalité du montant disponible (15 000 FCFA)'));

        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/withdrawals'));
        $this->assertSame(20000.0, (float) $company->vault->fresh()->balance);
    }

    public function test_a_connect_withdrawal_pays_the_available_amount_to_the_registered_number_for_free(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);
        Sanctum::actingAs($user, ['*']);

        // No payment method or phone: Yabeto pays the number registered during KYC.
        $this->postJson('/api/vault/withdraw', ['amount' => 15000, 'pin' => '1234'], ['X-Company-Id' => (string) $company->id])
            ->assertSuccessful()
            ->assertJsonPath('movement.status', 'succeeded')
            ->assertJsonPath('movement.fee_amount', '0.00');

        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/connect/accounts/acct_test/withdrawals')
            && $r->hasHeader('Idempotency-Key')
            && ! isset($r['amount']));
        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/disbursements'));
        $this->assertSame(5000.0, (float) $company->vault->fresh()->balance, 'the still-maturing part stays in the vault');
    }

    /** A Connect payout takes everything available, so one under review must block the next. */
    public function test_a_connect_payout_under_review_blocks_a_new_one(): void
    {
        [$user, $company] = $this->companyWithVault(approved: true);
        $company->vault->movements()->create([
            'type' => 'withdraw', 'amount' => 3000, 'net_amount' => 3000, 'status' => 'needs_review',
            'provider' => VaultTransactionService::CONNECT_PROVIDER,
        ]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/vault/withdraw', ['amount' => 15000, 'pin' => '1234'], ['X-Company-Id' => (string) $company->id])
            ->assertStatus(409)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'vérification'));

        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), '/withdrawals'));
    }

    public function test_a_legacy_withdrawal_still_needs_a_payment_method(): void
    {
        [$user, $company] = $this->companyWithVault();
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/vault/withdraw', ['amount' => 5000, 'pin' => '1234', 'phone' => '242068166360'], ['X-Company-Id' => (string) $company->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Moyen de paiement requis.');
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
