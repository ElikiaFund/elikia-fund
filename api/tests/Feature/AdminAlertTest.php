<?php

namespace Tests\Feature;

use App\Mail\AdminAlertRaised;
use App\Models\AdminAlert;
use App\Models\Company;
use App\Models\Role;
use App\Models\Setting;
use App\Models\User;
use App\Models\Vault;
use App\Models\VaultMovement;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class AdminAlertTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'whsec_test';

    protected function setUp(): void
    {
        parent::setUp();

        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'k', 'mode' => 'sandbox', 'webhook_secret' => self::WEBHOOK_SECRET]);
        Setting::updateOrCreate(['key' => 'platform'], ['value' => ['name' => 'Elikia Fund', 'support_email' => 'ops@elikiafund.test']]);
        Http::preventStrayRequests();
    }

    public function test_a_withdrawal_flagged_for_review_alerts_support_in_the_console_and_by_email(): void
    {
        Mail::fake();
        Http::fake();
        $movement = $this->withdrawalWithoutReference(companyName: 'Boutique Mabiala');

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $alert = AdminAlert::sole();
        $this->assertSame(AdminAlert::WITHDRAWAL_NEEDS_REVIEW, $alert->type);
        $this->assertSame($movement->id, $alert->vault_movement_id);
        $this->assertStringContainsString('Boutique Mabiala', $alert->title);
        Mail::assertSent(AdminAlertRaised::class, fn ($mail) => $mail->hasTo('ops@elikiafund.test') && $mail->alert->is($alert));
    }

    public function test_a_mail_outage_never_stops_the_withdrawal_from_being_flagged(): void
    {
        Http::fake();
        Mail::shouldReceive('to')->andThrow(new RuntimeException('SMTP down'));
        $movement = $this->withdrawalWithoutReference();

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('needs_review', $movement->fresh()->status);
        $this->assertSame(1, AdminAlert::count());
    }

    public function test_a_blocked_connect_refund_raises_one_alert_even_if_redelivered(): void
    {
        Mail::fake();
        Company::factory()->create(['name' => 'Atelier Ngoma', 'yabeto_account_id' => 'acct_ngoma']);
        $event = [
            'id' => 'evt_blocked',
            'type' => 'connect.refund.blocked_insufficient_funds',
            'accountId' => 'acct_ngoma',
            'data' => ['required' => 5000, 'available' => 1000, 'shortfall' => 4000, 'currency' => 'xaf'],
        ];

        $this->sendWebhook($event)->assertOk();
        $this->sendWebhook($event)->assertOk();

        $alert = AdminAlert::sole();
        $this->assertSame(AdminAlert::CONNECT_REFUND_BLOCKED, $alert->type);
        $this->assertStringContainsString('Atelier Ngoma', $alert->body);
        $this->assertStringContainsString('4 000 FCFA', $alert->body);
        Mail::assertSentCount(1);
    }

    public function test_admins_list_and_acknowledge_alerts(): void
    {
        $older = AdminAlert::create(['type' => 'withdrawal_needs_review', 'title' => 'A', 'body' => 'a']);
        $newer = AdminAlert::create(['type' => 'connect_refund_blocked', 'title' => 'B', 'body' => 'b']);
        $admin = $this->actingAsAdmin();

        $this->getJson('/api/admin/alerts')->assertOk()->assertJsonCount(2);

        $this->postJson("/api/admin/alerts/{$older->id}/acknowledge")
            ->assertOk()
            ->assertJsonPath('acknowledged_by.id', $admin->id);

        // Unacknowledged alerts come first.
        $this->getJson('/api/admin/alerts')->assertJsonPath('0.id', $newer->id);

        $this->postJson('/api/admin/alerts/acknowledge-all')->assertOk()->assertJsonPath('acknowledged', 1);
        $this->assertSame(0, AdminAlert::whereNull('acknowledged_at')->count());
    }

    public function test_merchants_cannot_see_alerts(): void
    {
        Sanctum::actingAs(User::factory()->create(), ['*']);

        $this->getJson('/api/admin/alerts')->assertForbidden();
    }

    private function withdrawalWithoutReference(string $companyName = 'Entreprise'): VaultMovement
    {
        $vault = Vault::factory()->for(Company::factory()->create(['name' => $companyName]))->create(['balance' => 15000]);
        $movement = $vault->movements()->create([
            'type' => 'withdraw', 'amount' => 5000, 'net_amount' => 4900, 'status' => 'processing', 'provider' => 'yabeto',
        ]);
        $movement->forceFill(['created_at' => now()->subHour()])->save();

        return $movement;
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create(['role_id' => Role::factory()->create(['name' => 'Support'])->id]);
        Sanctum::actingAs($admin, ['*']);

        return $admin;
    }

    private function sendWebhook(array $body)
    {
        $raw = json_encode($body);
        $timestamp = (string) time();

        return $this->call('POST', '/api/webhooks/yabeto', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_X_YABETOO_WEBHOOK_EVENT' => $body['type'],
            'HTTP_X_YABETOO_WEBHOOK_TIMESTAMP' => $timestamp,
            'HTTP_X_YABETOO_WEBHOOK_SIGNATURE' => 'v1='.hash_hmac('sha256', "{$timestamp}.{$raw}", self::WEBHOOK_SECRET),
        ], $raw);
    }
}
