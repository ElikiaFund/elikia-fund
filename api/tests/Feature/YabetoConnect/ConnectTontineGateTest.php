<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use App\Services\TontinePayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** A tontine's pot lands on its organising company's account, so that company's KYC gates it. */
class ConnectTontineGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_members_cannot_contribute_until_the_organising_company_is_verified(): void
    {
        YabetoSetting::current()->update([
            'is_enabled' => true, 'secret_key' => 'k', 'mode' => 'sandbox',
            'connect_enabled' => true, 'connect_mode' => 'platform',
        ]);
        Http::fake();

        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create(['yabeto_connect_required' => true]);
        $group = Group::factory()->for($owner, 'owner')->create(['frequency' => 'monthly', 'company_id' => $company->id]);

        $member = User::factory()->create();
        $group->members()->attach($member->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);
        Sanctum::actingAs($member, ['*']);

        $this->postJson("/api/groups/{$group->id}/contribute", ['payment_method' => 'mtn_momo', 'phone' => '242068166360'], [
            'X-Company-Id' => (string) Company::factory()->for($member)->create()->id,
        ])
            ->assertForbidden()
            ->assertJsonPath('code', 'identity_verification_required');

        Http::assertNothingSent();
        $this->assertDatabaseCount('contributions', 0);
    }

    /**
     * Under Connect the pot already sits on the organiser's account (every contribution was paid
     * on its behalf), so the payout is a vault credit, exactly as for a legacy group — never a
     * Connect withdrawal, which would also sweep out the company's own savings.
     */
    public function test_a_connect_tontine_payout_credits_the_organisers_vault_without_calling_yabeto(): void
    {
        $this->enableConnect();
        Http::fake();

        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create([
            'yabeto_connect_required' => true,
            'yabeto_account_id' => 'acct_org',
            'yabeto_verification_status' => 'approved',
            'yabeto_capabilities' => ['resolved' => true, 'allowed_operations' => ['withdraw']],
        ]);
        Vault::factory()->for($company)->create(['balance' => 1000]);
        $group = Group::factory()->for($owner, 'owner')->create(['frequency' => 'monthly', 'company_id' => $company->id]);
        $group->members()->attach($owner->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $cyclePeriod = $group->currentCyclePeriod();
        Contribution::factory()->for($group)->for($owner)->create([
            'cycle_period' => $cyclePeriod, 'status' => 'succeeded', 'paid_at' => now(),
            'company_id' => $company->id, 'net_amount' => 9000,
        ]);

        app(TontinePayoutService::class)->disburse($group, $cyclePeriod);

        $this->assertSame(10000.0, (float) $company->vault->fresh()->balance);
        Http::assertNothingSent();
    }

    private function enableConnect(): void
    {
        YabetoSetting::current()->update([
            'is_enabled' => true, 'secret_key' => 'k', 'mode' => 'sandbox',
            'connect_enabled' => true, 'connect_mode' => 'platform',
        ]);
    }
}
