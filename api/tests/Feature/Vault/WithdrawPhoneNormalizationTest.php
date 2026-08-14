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
 * Yabetoo only documents two valid `msisdn` shapes (yabeto.md §4): `+242066594470` or
 * `242066594470` — neither with a space. Mobile's phone inputs keep a literal `+242 ` prefix
 * (with the space) for display, and that raw string used to flow straight through unnormalized —
 * a real disbursement request confirmed working via Postman with a clean digits-only number, but
 * failing from the app with the same number in the app's own "+242 xxxxxxxxx" shape. This proves
 * YabetoService strips it to digits-only before it ever reaches Yabeto, regardless of the shape a
 * caller passes in.
 */
class WithdrawPhoneNormalizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_msisdn_sent_to_yabeto_has_no_plus_or_spaces_even_when_the_caller_passes_some(): void
    {
        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'test-secret-key', 'mode' => 'sandbox']);

        Http::fake([
            'pay.sandbox.yabetoopay.com/*' => Http::response(['id' => 'dis_test123', 'status' => 'processing']),
        ]);

        $user = User::factory()->create();
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        Vault::factory()->for($company)->create(['balance' => 20000]);

        Sanctum::actingAs($user, ['*']);

        // Exactly the shape mobile's vault-transaction.tsx keeps: a literal "+242 " prefix with
        // the space, then the locally-typed digits.
        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242 068166360',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertStatus(202);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/disbursements')
                && $request['payment_method_data']['momo']['msisdn'] === '242068166360';
        });
    }
}
