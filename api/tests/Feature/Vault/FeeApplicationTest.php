<?php

namespace Tests\Feature\Vault;

use App\Models\User;
use App\Models\Vault;
use App\Models\YabetoSetting;
use App\Services\FeeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Covers the fee math introduced across FeeService/VaultTransactionService/VaultController: a
 * deposit must credit the vault with the post-fee net amount (not what the user typed), a
 * withdrawal must debit the full gross amount from the vault while disbursing only the net via
 * Yabeto, and the independently-configured Yabeto/Elikia halves must always sum exactly to the
 * total fee — see FeeService::breakdown() and "Design Decision B" in the fee/security plan for
 * why the split isn't a single derived ratio.
 */
class FeeApplicationTest extends TestCase
{
    use RefreshDatabase;

    public function test_deposit_credits_the_vault_with_net_not_gross(): void
    {
        $user = User::factory()->create();
        $vault = Vault::factory()->for($user)->activated()->create(['balance' => 0]);
        Sanctum::actingAs($user, ['*']);

        $amount = 10000;
        $expected = app(FeeService::class)->deposit($amount);

        $response = $this->postJson('/api/vault/deposit', [
            'amount' => $amount,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ]);

        $response->assertCreated();
        $this->assertEqualsWithDelta($expected['fee_amount'], (float) $response->json('movement.fee_amount'), 0.01);
        $this->assertEqualsWithDelta($expected['net_amount'], (float) $response->json('movement.net_amount'), 0.01);
        $this->assertEqualsWithDelta($expected['net_amount'], (float) $vault->fresh()->balance, 0.01);
    }

    public function test_withdrawal_debits_gross_and_disburses_net(): void
    {
        YabetoSetting::current()->update([
            'is_enabled' => true,
            'secret_key' => 'test-secret-key',
            'mode' => 'sandbox',
        ]);

        Http::fake([
            'pay.sandbox.yabetoopay.com/*' => Http::response(['id' => 'dis_test123', 'status' => 'processing']),
        ]);

        $user = User::factory()->create();
        $vault = Vault::factory()->for($user)->activated()->create(['balance' => 20000]);
        Sanctum::actingAs($user, ['*']);

        $amount = 10000;
        $expected = app(FeeService::class)->withdrawal($amount);

        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => $amount,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242060000000',
        ]);

        $response->assertStatus(202);
        // The vault is debited the full gross amount the user asked to withdraw — the fee is the
        // gap between that and what Yabeto actually disburses below, not extra on top of it.
        $this->assertEqualsWithDelta(20000 - $amount, (float) $vault->fresh()->balance, 0.01);

        Http::assertSent(function ($request) use ($expected) {
            return str_contains($request->url(), '/disbursements')
                && $request['amount'] === (int) round($expected['net_amount']);
        });
    }

    public function test_provider_and_platform_fee_always_sum_to_fee_amount(): void
    {
        $fees = app(FeeService::class);

        $breakdowns = [$fees->deposit(15000), $fees->withdrawal(15000), $fees->contribution(15000)];

        foreach ($breakdowns as $breakdown) {
            $this->assertEqualsWithDelta(
                $breakdown['fee_amount'],
                $breakdown['provider_fee_amount'] + $breakdown['platform_fee_amount'],
                0.001,
            );
        }
    }

    public function test_a_deposit_below_the_fixed_fee_floor_is_rejected(): void
    {
        $user = User::factory()->create();
        $vault = Vault::factory()->for($user)->activated()->create(['balance' => 0]);
        Sanctum::actingAs($user, ['*']);

        // 1 FCFA can never clear the 100 FCFA fixed deposit fee alone — net_amount would be
        // negative, so FeeService must reject it before any movement is created.
        $response = $this->postJson('/api/vault/deposit', [
            'amount' => 1,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
        ]);

        $response->assertStatus(422);
        $this->assertEqualsWithDelta(0.0, (float) $vault->fresh()->balance, 0.01);
    }
}
