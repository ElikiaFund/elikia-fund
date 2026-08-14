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
 * Confirmed against a real production error: Yabeto's Disbursement endpoint rejects a request
 * with 422 "The last_name field must be defined" — every caller used to send the user's full
 * `name` as first_name with a hardcoded empty last_name, which is exactly what broke every real
 * withdrawal. YabetoService::splitName() now derives both fields from the one `name` field this
 * app actually stores, and never sends an empty last_name.
 */
class WithdrawNameSplitTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_multi_word_name_splits_into_first_and_last(): void
    {
        $this->assertDisbursementSentWith('Trésor Milandou Nzoussi', 'Trésor', 'Milandou Nzoussi');
    }

    /** No natural split available — repeats itself rather than leaving last_name empty. */
    public function test_a_single_word_name_repeats_itself_in_both_fields(): void
    {
        $this->assertDisbursementSentWith('Trésor', 'Trésor', 'Trésor');
    }

    private function assertDisbursementSentWith(string $fullName, string $expectedFirstName, string $expectedLastName): void
    {
        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'test-secret-key', 'mode' => 'sandbox']);

        Http::fake([
            'pay.sandbox.yabetoopay.com/*' => Http::response(['id' => 'dis_test123', 'status' => 'processing']),
        ]);

        $user = User::factory()->create(['name' => $fullName]);
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        Vault::factory()->for($company)->create(['balance' => 20000]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/vault/withdraw', [
            'amount' => 10000,
            'pin' => '1234',
            'payment_method' => 'mtn_momo',
            'phone' => '+242068166360',
        ], ['X-Company-Id' => (string) $company->id]);

        $response->assertStatus(202);

        Http::assertSent(function ($request) use ($expectedFirstName, $expectedLastName) {
            return str_contains($request->url(), '/disbursements')
                && $request['first_name'] === $expectedFirstName
                && $request['last_name'] === $expectedLastName
                && $request['last_name'] !== '';
        });
    }
}
