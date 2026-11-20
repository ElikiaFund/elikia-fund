<?php

namespace Tests\Feature\YabetoConnect;

use App\Models\Company;
use App\Models\Group;
use App\Models\User;
use App\Models\YabetoSetting;
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
            'connect_enabled' => true, 'connect_mode' => 'account',
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
}
