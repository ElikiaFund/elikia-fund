<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\User;
use App\Models\YabetoConnectAuditLog;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CompanyConnectProvisioningTest extends TestCase
{
    use RefreshDatabase;

    private const COMPANY = [
        'name' => 'Boutique Ada',
        'category' => 'commerce',
        'department' => 'brazzaville',
        'city' => 'Brazzaville',
        'neighborhood' => 'Poto-Poto',
    ];

    public function test_a_new_company_gets_a_connected_account_when_connect_is_ready(): void
    {
        $this->enableConnect();
        Http::fake(['pay.sandbox.yabetoopay.com/v1/connect/accounts' => Http::response([
            'id' => 'acct_new', 'object' => 'connect_account', 'status' => 'active', 'fee_payer' => 'account',
        ], 201)]);

        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson('/api/companies', self::COMPANY)
            ->assertCreated()
            ->assertJsonPath('yabeto_account_id', 'acct_new');

        Http::assertSent(fn (Request $r) => $r->hasHeader('Idempotency-Key')
            && $r['country'] === 'cg'
            && ! isset($r['phone']) && ! isset($r['fee_payer']) && ! isset($r['type']));
        $this->assertDatabaseHas('yabeto_connect_audit_log', ['action' => 'provision', 'result' => 'success', 'source' => 'signup']);
    }

    public function test_no_connect_call_is_made_while_connect_is_disabled(): void
    {
        Http::fake();
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson('/api/companies', self::COMPANY)
            ->assertCreated()
            ->assertJsonPath('yabeto_account_id', null);

        Http::assertNothingSent();
    }

    public function test_a_yabeto_outage_never_blocks_signup_and_is_audited(): void
    {
        $this->enableConnect();
        Http::fake(['pay.sandbox.yabetoopay.com/*' => Http::response(['message' => 'down'], 503)]);
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson('/api/companies', self::COMPANY)->assertCreated();

        $company = Company::first();
        $this->assertNull($company->yabeto_account_id);
        $this->assertTrue($company->yabeto_connect_required, 'a failed provisioning must not make the company a legacy one');
        $this->assertSame(1, YabetoConnectAuditLog::where('result', 'failure')->count());

        $this->getJson("/api/companies/{$company->id}/yabeto-connect")
            ->assertOk()
            ->assertJsonPath('requires_verification', true)
            ->assertJsonPath('has_account', false);
    }

    public function test_a_company_created_while_connect_is_off_is_a_legacy_company(): void
    {
        Http::fake();
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->postJson('/api/companies', self::COMPANY)->assertCreated();

        $this->assertFalse(Company::first()->yabeto_connect_required);
    }

    public function test_a_merchant_cannot_read_another_merchants_connect_status(): void
    {
        $company = Company::factory()->create();
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson("/api/companies/{$company->id}/yabeto-connect")->assertForbidden();
    }

    private function enableConnect(): void
    {
        YabetoSetting::current()->update([
            'is_enabled' => true,
            'secret_key' => 'test-secret-key',
            'mode' => 'sandbox',
            'connect_enabled' => true,
            'connect_mode' => 'account',
        ]);
    }
}
