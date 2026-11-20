<?php

namespace Tests\Feature\Vault;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Models\Vault;
use App\Models\VaultMovement;
use App\Models\YabetoSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * A withdrawal Yabeto can't confirm either way must never be refunded automatically — if the
 * payout did go through, a refund would let the merchant withdraw the same money twice.
 */
class WithdrawalReviewTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        YabetoSetting::current()->update(['is_enabled' => true, 'secret_key' => 'k', 'mode' => 'sandbox']);
        Http::preventStrayRequests();
    }

    public function test_an_unconfirmable_withdrawal_is_flagged_for_review_instead_of_refunded(): void
    {
        Http::fake(['*' => Http::response(['message' => 'boom'], 500)]);
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_unknown', hoursAgo: 25);

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('needs_review', $movement->fresh()->status);
        $this->assertNotNull($movement->fresh()->review_reason);
        $this->assertSame(15000.0, (float) $vault->fresh()->balance, 'the reserved amount must stay out of the vault');
    }

    public function test_an_unconfirmable_deposit_still_fails_as_before(): void
    {
        Http::fake(['*' => Http::response(['message' => 'boom'], 500)]);
        [$vault, $movement] = $this->stuckMovement('deposit', reference: 'pi_unknown', hoursAgo: 25);

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('failed', $movement->fresh()->status);
        $this->assertSame(15000.0, (float) $vault->fresh()->balance);
    }

    public function test_a_withdrawal_whose_request_died_before_yabeto_answered_is_flagged(): void
    {
        Http::fake();
        [, $movement] = $this->stuckMovement('withdraw', reference: null, hoursAgo: 1);

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('needs_review', $movement->fresh()->status);
        Http::assertNothingSent();
    }

    public function test_a_flagged_withdrawal_stays_in_review_while_yabeto_still_says_processing(): void
    {
        Http::fake(['*/disbursement/*' => Http::response(['id' => 'dis_slow', 'status' => 'processing'])]);
        [, $movement] = $this->stuckMovement('withdraw', reference: 'dis_slow', hoursAgo: 30, status: 'needs_review');

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('needs_review', $movement->fresh()->status);
    }

    public function test_a_late_yabeto_outcome_still_settles_a_flagged_withdrawal(): void
    {
        Http::fake(['*/disbursement/*' => Http::response(['id' => 'dis_late', 'status' => 'failed'])]);
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_late', hoursAgo: 30, status: 'needs_review');

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('failed', $movement->fresh()->status);
        $this->assertSame(20000.0, (float) $vault->fresh()->balance, 'a confirmed failure refunds the reserved amount');
    }

    public function test_a_canceled_withdrawal_is_refunded_too(): void
    {
        Http::fake(['*/disbursement/*' => Http::response(['id' => 'dis_canceled', 'status' => 'canceled'])]);
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_canceled', hoursAgo: 30, status: 'needs_review');

        $this->artisan('payments:reconcile-pending')->assertSuccessful();

        $this->assertSame('canceled', $movement->fresh()->status);
        $this->assertSame(20000.0, (float) $vault->fresh()->balance, 'no money moved, so the reserved amount comes back');
    }

    public function test_a_past_simulated_withdrawal_does_not_block_a_real_one(): void
    {
        Http::fake(['*/disbursements' => Http::response(['id' => 'dis_real', 'status' => 'processing'])]);
        [$vault, , $user] = $this->stuckMovement('withdraw', reference: null, hoursAgo: 48, status: 'completed');
        $vault->movements()->first()->update(['provider' => null]);
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/vault/withdraw', [
            'amount' => 5000, 'pin' => '1234', 'payment_method' => 'mtn_momo', 'phone' => '242068166360',
        ], ['X-Company-Id' => (string) $vault->company_id])->assertSuccessful();
    }

    public function test_a_flagged_withdrawal_does_not_block_the_next_one(): void
    {
        Http::fake(['*/disbursements' => Http::response(['id' => 'dis_next', 'status' => 'processing'])]);
        [$vault, , $user] = $this->stuckMovement('withdraw', reference: 'dis_old', hoursAgo: 30, status: 'needs_review');
        Sanctum::actingAs($user, ['*']);

        $this->postJson('/api/vault/withdraw', [
            'amount' => 5000, 'pin' => '1234', 'payment_method' => 'mtn_momo', 'phone' => '242068166360',
        ], ['X-Company-Id' => (string) $vault->company_id])->assertSuccessful();

        $this->assertSame(10000.0, (float) $vault->fresh()->balance);
    }

    public function test_support_refunds_a_flagged_withdrawal_that_never_paid_out(): void
    {
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_x', hoursAgo: 30, status: 'needs_review');
        $admin = $this->admin(withPermission: true);

        $this->postJson("/api/admin/vault-movements/{$movement->id}/settle", [
            'outcome' => 'failed', 'password' => 'password', 'note' => 'Absent du tableau de bord Yabeto.',
        ])->assertOk()->assertJsonPath('status', 'failed');

        $this->assertSame(20000.0, (float) $vault->fresh()->balance);
        $this->assertDatabaseHas('vault_movements', ['id' => $movement->id, 'reviewed_by_user_id' => $admin->id, 'review_note' => 'Absent du tableau de bord Yabeto.']);
    }

    public function test_support_confirms_a_flagged_withdrawal_that_did_pay_out(): void
    {
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_y', hoursAgo: 30, status: 'needs_review');
        $this->admin(withPermission: true);

        $this->postJson("/api/admin/vault-movements/{$movement->id}/settle", ['outcome' => 'succeeded', 'password' => 'password'])
            ->assertOk()->assertJsonPath('status', 'succeeded');

        $this->assertSame(15000.0, (float) $vault->fresh()->balance);
    }

    public function test_settling_needs_the_permission_and_the_right_password(): void
    {
        [$vault, $movement] = $this->stuckMovement('withdraw', reference: 'dis_z', hoursAgo: 30, status: 'needs_review');

        $this->admin(withPermission: false);
        $this->postJson("/api/admin/vault-movements/{$movement->id}/settle", ['outcome' => 'failed', 'password' => 'password'])->assertForbidden();

        $this->admin(withPermission: true);
        $this->postJson("/api/admin/vault-movements/{$movement->id}/settle", ['outcome' => 'failed', 'password' => 'wrong'])->assertStatus(422);

        $this->assertSame('needs_review', $movement->fresh()->status);
        $this->assertSame(15000.0, (float) $vault->fresh()->balance);
    }

    public function test_only_a_flagged_withdrawal_can_be_settled(): void
    {
        [, $movement] = $this->stuckMovement('withdraw', reference: 'dis_done', hoursAgo: 1, status: 'succeeded');
        $this->admin(withPermission: true);

        $this->postJson("/api/admin/vault-movements/{$movement->id}/settle", ['outcome' => 'failed', 'password' => 'password'])->assertStatus(409);
    }

    /**
     * A vault of 20 000 with one movement of 5 000. For a withdrawal, the 5 000 is already
     * reserved (balance 15 000), as VaultTransactionService::withdraw() does.
     *
     * @return array{0: Vault, 1: VaultMovement, 2: User}
     */
    private function stuckMovement(string $type, ?string $reference, int $hoursAgo, string $status = 'processing'): array
    {
        $user = User::factory()->create(['name' => 'Ada Mabiala']);
        $user->forceFill(['pin_hash' => Hash::make('1234'), 'pin_set_at' => now()])->save();
        $company = Company::factory()->for($user)->create();
        $vault = Vault::factory()->for($company)->create(['balance' => 15000]);

        $movement = $vault->movements()->create([
            'type' => $type, 'amount' => 5000, 'net_amount' => 4900, 'status' => $status,
            'provider' => 'yabeto', 'yabeto_reference' => $reference,
        ]);
        $movement->forceFill(['created_at' => now()->subHours($hoursAgo)])->save();

        return [$vault, $movement, $user];
    }

    private function admin(bool $withPermission): User
    {
        $role = Role::factory()->create(['name' => 'Finance']);

        if ($withPermission) {
            $role->permissions()->attach(Permission::firstOrCreate(
                ['key' => 'vault_movements.settle'],
                ['label' => 'Régler les retraits à vérifier', 'group' => 'Finance'],
            ));
        }

        $admin = User::factory()->create(['role_id' => $role->id, 'password' => Hash::make('password')]);
        Sanctum::actingAs($admin, ['*']);

        return $admin;
    }
}
