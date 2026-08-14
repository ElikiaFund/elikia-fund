<?php

namespace Tests\Feature\Group;

use App\Models\Company;
use App\Models\Group;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * GET /groups is the one /groups route scoped to the active company (see routes/api.php) — a
 * person can belong to tontines under several of their own companies, but the list only ever
 * shows the active one's. Membership itself (who can join/contribute/etc.) stays person-based and
 * untouched — see GroupPayoutCompanyIsolationTest for that boundary.
 */
class GroupListCompanyIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_list_only_shows_the_active_companys_tontines(): void
    {
        $user = User::factory()->create();
        $companyA = Company::factory()->for($user)->create();
        $companyB = Company::factory()->for($user)->create();

        $groupA = Group::factory()->for($user, 'owner')->create(['company_id' => $companyA->id, 'name' => 'Tontine A']);
        $groupA->members()->attach($user->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $groupB = Group::factory()->for($user, 'owner')->create(['company_id' => $companyB->id, 'name' => 'Tontine B']);
        $groupB->members()->attach($user->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        Sanctum::actingAs($user, ['*']);

        $asCompanyA = $this->getJson('/api/groups', ['X-Company-Id' => (string) $companyA->id]);
        $asCompanyA->assertOk();
        $this->assertSame([$groupA->id], collect($asCompanyA->json())->pluck('id')->all());

        $asCompanyB = $this->getJson('/api/groups', ['X-Company-Id' => (string) $companyB->id]);
        $asCompanyB->assertOk();
        $this->assertSame([$groupB->id], collect($asCompanyB->json())->pluck('id')->all());
    }

    public function test_the_list_requires_an_active_company(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/groups');

        $response->assertStatus(400);
    }

    /** A member's own tontine detail page must stay reachable regardless of which company is
     * active — only the list is company-scoped, not membership/access to a specific group. */
    public function test_a_specific_group_stays_reachable_regardless_of_active_company(): void
    {
        $user = User::factory()->create();
        $company = Company::factory()->for($user)->create();
        $group = Group::factory()->for($user, 'owner')->create(['company_id' => $company->id]);
        $group->members()->attach($user->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        Sanctum::actingAs($user, ['*']);

        // No X-Company-Id at all — GET /groups/{group} deliberately stays outside
        // resolve-active-company, unlike the listing endpoint above.
        $response = $this->getJson("/api/groups/{$group->id}");

        $response->assertOk();
    }
}
