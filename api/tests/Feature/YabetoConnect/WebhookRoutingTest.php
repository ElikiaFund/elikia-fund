<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\Vault;
use App\Models\YabetoSetting;
use App\Models\YabetoWebhookEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WebhookRoutingTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'whsec_test';

    protected function setUp(): void
    {
        parent::setUp();

        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'k', 'webhook_secret' => self::SECRET]);
    }

    /** Legacy events are flat (`id`/`status` at the top level) and must keep resolving deposits. */
    public function test_a_legacy_flat_intent_event_still_credits_the_vault(): void
    {
        $vault = Vault::factory()->for(Company::factory())->create(['balance' => 0]);
        $vault->movements()->create([
            'type' => 'deposit', 'amount' => 10000, 'net_amount' => 9700, 'status' => 'processing',
            'provider' => 'yabeto', 'yabeto_reference' => 'pi_legacy',
        ]);

        $this->sendWebhook('intent.completed', ['id' => 'pi_legacy', 'status' => 'succeeded'])->assertOk();

        $this->assertSame(9700.0, (float) $vault->fresh()->balance);
        $this->assertSame(0, YabetoWebhookEvent::count());
    }

    public function test_a_redelivered_connect_event_is_recorded_once(): void
    {
        $event = [
            'id' => 'evt_1',
            'type' => 'connect.refund.blocked_insufficient_funds',
            'accountId' => 'acct_x',
            'data' => ['required' => 5000, 'available' => 1000, 'shortfall' => 4000, 'currency' => 'xaf'],
        ];

        $this->sendWebhook($event['type'], $event)->assertOk();
        $this->sendWebhook($event['type'], $event)->assertOk();

        $this->assertSame(1, YabetoWebhookEvent::where('event_id', 'evt_1')->count());
    }

    public function test_an_unsigned_webhook_is_rejected(): void
    {
        $this->postJson('/api/webhooks/yabeto', ['id' => 'pi_x', 'status' => 'succeeded'])->assertUnauthorized();
    }

    private function sendWebhook(string $event, array $body)
    {
        $raw = json_encode($body);
        $timestamp = (string) time();

        return $this->call('POST', '/api/webhooks/yabeto', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_YABETOO_WEBHOOK_EVENT' => $event,
            'HTTP_X_YABETOO_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_YABETOO_WEBHOOK_SIGNATURE' => 'v1='.hash_hmac('sha256', "{$timestamp}.{$raw}", self::SECRET),
        ], $raw);
    }
}
