<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ConnectSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        YabetoSetting::current()->update([
            'is_enabled' => true, 'secret_key' => 'k', 'account_id' => 'acct_elikia', 'mode' => 'sandbox',
        ]);

        $role = Role::factory()->create(['name' => 'Super Admin']);
        $role->permissions()->attach(Permission::factory()->create(['key' => 'settings.manage', 'label' => 'Gérer les paramètres', 'group' => 'settings']));
        Sanctum::actingAs(User::factory()->create(['role_id' => $role->id]), ['*']);
    }

    /** Yabeto reports `platform` (fee_payer `account`) — never `account` itself — for our mode. */
    public function test_a_platform_activation_is_the_expected_connect_mode(): void
    {
        Http::fake(['*/connect/activations' => Http::response(['id' => 'acct_elikia', 'object' => 'connect_activation', 'connect_mode' => 'platform'])]);

        $this->postJson('/api/admin/settings/yabeto/connect-status')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('connect_mode', 'platform');

        $this->assertSame('platform', YabetoSetting::current()->connect_mode);
    }

    public function test_a_marketplace_activation_is_flagged_as_misaligned(): void
    {
        Http::fake(['*/connect/activations' => Http::response(['id' => 'acct_elikia', 'object' => 'connect_activation', 'connect_mode' => 'marketplace'])]);

        $this->postJson('/api/admin/settings/yabeto/connect-status')->assertJsonPath('success', false);
    }

    public function test_webhook_registration_subscribes_to_the_connect_events(): void
    {
        Http::fake(['*/account/acct_elikia/webhooks' => Http::response(['id' => 'wh_1', 'secret' => 'whsec_1'], 201)]);

        $this->postJson('/api/admin/settings/yabeto/register-webhook')
            ->assertOk()
            ->assertJsonPath('connect_events_registered', true);

        Http::assertSent(fn (Request $r) => in_array('intent.completed', $r['enabled_events'], true)
            && in_array('connect.funds.available', $r['enabled_events'], true)
            && in_array('connect.refund.blocked_insufficient_funds', $r['enabled_events'], true));
        $this->assertSame('whsec_1', YabetoSetting::current()->webhook_secret);
    }

    public function test_webhook_registration_falls_back_to_legacy_events_when_yabeto_refuses_connect_ones(): void
    {
        Http::fake(['*/account/acct_elikia/webhooks' => Http::sequence()
            ->push(['error' => ['message' => 'invalid event']], 422)
            ->push(['id' => 'wh_2', 'secret' => 'whsec_2'], 201)]);

        $this->postJson('/api/admin/settings/yabeto/register-webhook')
            ->assertOk()
            ->assertJsonPath('connect_events_registered', false)
            ->assertJsonPath('message', fn ($m) => str_contains($m, 'connect.funds.available'));

        Http::assertSentCount(2);
        Http::assertSent(fn (Request $r) => $r['enabled_events'] === ['intent.completed', 'disbursement.completed']);
        $this->assertSame('whsec_2', YabetoSetting::current()->webhook_secret);
    }
}
