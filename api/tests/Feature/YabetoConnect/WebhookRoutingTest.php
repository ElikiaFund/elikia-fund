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

    /** Shape copied from a live `intent.succeeded` delivery: reference/status nested under data.intent. */
    public function test_a_live_intent_succeeded_event_credits_the_vault(): void
    {
        $vault = Vault::factory()->for(Company::factory())->create(['balance' => 0]);
        $vault->movements()->create([
            'type' => 'deposit', 'amount' => 10000, 'net_amount' => 9400, 'status' => 'processing',
            'provider' => 'yabeto', 'yabeto_reference' => 'pi_live',
        ]);

        $this->sendWebhook('intent.succeeded', $this->intentEvent('evt_ok', 'intent.succeeded', 'pi_live', 'succeeded'))->assertOk();

        $this->assertSame(9400.0, (float) $vault->fresh()->balance);
        $this->assertDatabaseHas('vault_movements', ['yabeto_reference' => 'pi_live', 'status' => 'succeeded']);
    }

    public function test_a_live_intent_failed_event_fails_the_deposit_without_crediting(): void
    {
        $vault = Vault::factory()->for(Company::factory())->create(['balance' => 0]);
        $vault->movements()->create([
            'type' => 'deposit', 'amount' => 750, 'net_amount' => 600, 'status' => 'processing',
            'provider' => 'yabeto', 'yabeto_reference' => 'pi_failed',
        ]);

        $this->sendWebhook('intent.failed', $this->intentEvent('evt_ko', 'intent.failed', 'pi_failed', 'failed'))->assertOk();

        $this->assertSame(0.0, (float) $vault->fresh()->balance);
        $this->assertDatabaseHas('vault_movements', ['yabeto_reference' => 'pi_failed', 'status' => 'failed']);
    }

    /** Shape copied from a live `disbursement.succeeded` delivery: reference/status directly under data. */
    public function test_a_live_disbursement_succeeded_event_completes_the_withdrawal(): void
    {
        $vault = Vault::factory()->for(Company::factory())->create(['balance' => 0]);
        $vault->movements()->create([
            'type' => 'withdraw', 'amount' => 2450, 'net_amount' => 2413.25, 'status' => 'processing',
            'provider' => 'yabeto', 'yabeto_reference' => 'dis_live',
        ]);

        $this->sendWebhook('disbursement.succeeded', [
            'id' => 'evt_dis',
            'type' => 'disbursement.succeeded',
            'created_at' => '2026-09-10T13:08:17.704+00:00',
            'data' => [
                'id' => 'dis_live', 'object' => 'disbursement', 'status' => 'succeeded', 'amount' => 2413.25,
                'currency' => 'XAF', 'phone' => '242060000000', 'operatorName' => 'mtn', 'failureCode' => null,
            ],
        ])->assertOk();

        $this->assertDatabaseHas('vault_movements', ['yabeto_reference' => 'dis_live', 'status' => 'succeeded']);
    }

    public function test_an_intent_created_event_changes_nothing(): void
    {
        $vault = Vault::factory()->for(Company::factory())->create(['balance' => 0]);
        $vault->movements()->create([
            'type' => 'deposit', 'amount' => 10000, 'net_amount' => 9400, 'status' => 'processing',
            'provider' => 'yabeto', 'yabeto_reference' => 'pi_new',
        ]);

        $this->sendWebhook('intent.created', $this->intentEvent('evt_new', 'intent.created', 'pi_new', 'requires_confirmation'))->assertOk();

        $this->assertDatabaseHas('vault_movements', ['yabeto_reference' => 'pi_new', 'status' => 'processing']);
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

    private function intentEvent(string $eventId, string $type, string $intentId, string $status): array
    {
        return [
            'id' => $eventId,
            'type' => $type,
            'created_at' => '2026-11-20T19:04:46.121+00:00',
            'data' => [
                'charge' => ['id' => 'ch_x', 'object' => 'charge', 'status' => $status, 'intentId' => $intentId, 'amount' => 750],
                'intent' => ['id' => $intentId, 'object' => 'intent', 'status' => $status, 'amount' => 750, 'liveMode' => true],
            ],
        ];
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
