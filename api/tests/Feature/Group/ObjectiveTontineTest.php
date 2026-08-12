<?php

namespace Tests\Feature\Group;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\GroupRoundGoal;
use App\Models\User;
use App\Models\Vault;
use App\Services\GroupCycleRecipientService;
use App\Services\TontinePayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Goal-based tontines (recipient_mode = 'creator') reuse every existing contribution/payout
 * mechanic unchanged — these tests only cover what's actually new: goal validation, the pot
 * always resolving to the creator, and the round completing after a single payout instead of
 * waiting for every member to have received one. RoundLockTest/GroupPayoutCompanyIsolationTest
 * (untouched by this feature) are the regression proof that the other four recipient modes still
 * behave exactly as before.
 */
class ObjectiveTontineTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_creator_mode_group_without_goal_fields_fails_validation(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();

        Sanctum::actingAs($owner, ['*']);

        $response = $this->postJson('/api/groups', [
            'name' => 'Tontine Objectif Test',
            'company_id' => $company->id,
            'contribution_amount' => 20000,
            'frequency' => 'monthly',
            'recipient_mode' => 'creator',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['goal_text', 'target_amount']);
    }

    public function test_creating_a_creator_mode_group_with_goal_fields_creates_the_round_one_goal(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();

        Sanctum::actingAs($owner, ['*']);

        $response = $this->postJson('/api/groups', [
            'name' => 'Tontine Objectif Test',
            'company_id' => $company->id,
            'contribution_amount' => 20000,
            'frequency' => 'monthly',
            'recipient_mode' => 'creator',
            'goal_text' => 'Acheter un four industriel',
            'target_amount' => 500000,
        ]);

        $response->assertStatus(201);

        $goal = GroupRoundGoal::where('group_id', $response->json('id'))->where('round_number', 1)->first();

        $this->assertNotNull($goal);
        $this->assertSame('Acheter un four industriel', $goal->goal_text);
        $this->assertEqualsWithDelta(500000, (float) $goal->target_amount, 0.01);
    }

    public function test_resolve_for_always_resolves_the_owner_for_creator_mode(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();
        $group = Group::factory()->objectiveBased()->for($owner, 'owner')->create(['company_id' => $company->id]);
        $group->members()->attach($owner->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $member = User::factory()->create();
        $group->members()->attach($member->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $cycleRecipient = app(GroupCycleRecipientService::class)->resolveFor($group, $group->currentCyclePeriod());

        $this->assertSame($owner->id, $cycleRecipient->user_id);
    }

    public function test_the_round_completes_after_a_single_payout_once_everyone_has_contributed(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();
        Vault::factory()->for($company)->create(['balance' => 0]);

        $group = Group::factory()->objectiveBased()->for($owner, 'owner')->create(['company_id' => $company->id]);
        GroupRoundGoal::factory()->for($group)->create(['round_number' => 1, 'target_amount' => 500000]);

        $group->members()->attach($owner->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);
        $member = User::factory()->create();
        $group->members()->attach($member->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $cyclePeriod = $group->currentCyclePeriod();

        // The owner contributes like any other member — the goal fund's eligibility check is the
        // exact same "every eligible member has paid" rule as a rotation tontine, unchanged.
        foreach ([$owner, $member] as $contributor) {
            Contribution::factory()->for($group)->for($contributor)->create([
                'cycle_period' => $cyclePeriod,
                'status' => 'succeeded',
                'paid_at' => now(),
                'company_id' => $company->id,
            ]);
        }

        $result = app(TontinePayoutService::class)->disburse($group, $cyclePeriod);

        $this->assertTrue($result['round_completed']);
        $this->assertSame('completed', $group->fresh()->round_status);
        $this->assertSame($owner->id, $result['recipient']->user_id);
        $this->assertEqualsWithDelta($result['amount'], (float) $company->vault->fresh()->balance, 0.01);
        // Exactly one payout row for this round — a rotation tontine with 2 members would need
        // two (one per distinct recipient) before completeRoundIfDone() would flip it to completed.
        $this->assertSame(1, GroupCycleRecipient::where('group_id', $group->id)->where('round_number', 1)->count());
    }

    public function test_renewing_a_creator_mode_round_requires_a_new_goal(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();
        $group = Group::factory()->objectiveBased()->for($owner, 'owner')->create([
            'company_id' => $company->id,
            'round_status' => 'completed',
        ]);
        GroupRoundGoal::factory()->for($group)->create(['round_number' => 1]);

        Sanctum::actingAs($owner, ['*']);

        $missingGoal = $this->postJson("/api/groups/{$group->id}/renew-round", []);
        $missingGoal->assertStatus(422);
        $missingGoal->assertJsonValidationErrors(['goal_text', 'target_amount']);

        $withGoal = $this->postJson("/api/groups/{$group->id}/renew-round", [
            'goal_text' => 'Nouvel objectif du tour 2',
            'target_amount' => 300000,
        ]);
        $withGoal->assertStatus(200);

        $group->refresh();
        $this->assertSame(2, $group->round_number);
        $this->assertSame('active', $group->round_status);

        $newGoal = GroupRoundGoal::where('group_id', $group->id)->where('round_number', 2)->first();
        $this->assertNotNull($newGoal);
        $this->assertSame('Nouvel objectif du tour 2', $newGoal->goal_text);
    }

    /** Regression check: a plain rotation tontine's renew-round flow needs no goal fields at all. */
    public function test_renewing_a_non_creator_round_still_works_without_goal_fields(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->for($owner)->create();
        $group = Group::factory()->for($owner, 'owner')->create([
            'company_id' => $company->id,
            'recipient_mode' => 'join_order',
            'round_status' => 'completed',
        ]);

        Sanctum::actingAs($owner, ['*']);

        $response = $this->postJson("/api/groups/{$group->id}/renew-round", []);

        $response->assertStatus(200);
        $group->refresh();
        $this->assertSame(2, $group->round_number);
        $this->assertSame('active', $group->round_status);
    }
}
