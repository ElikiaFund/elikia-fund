<?php

namespace Tests\Feature\Group;

use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\User;
use App\Models\Vault;
use App\Services\TontinePayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Regression test for the single riskiest interaction in the round-completion batch: once a
 * round is locked, a passive GET from any member must never resolve a new cycle recipient —
 * doing so would silently consume a real rotation slot for a cycle that shouldn't exist yet,
 * corrupting the next round's order. See GroupCycleRecipientService::resolveFor()'s guard and
 * every call site that must pre-check Group::isRoundLocked() before reaching it.
 */
class RoundLockTest extends TestCase
{
    use RefreshDatabase;

    public function test_completing_a_round_locks_it(): void
    {
        $owner = User::factory()->create();
        $group = Group::factory()->for($owner, 'owner')->create(['frequency' => 'monthly']);
        $group->members()->attach($owner->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);
        Vault::factory()->for($owner)->create();

        $cyclePeriod = $group->currentCyclePeriod();

        Contribution::factory()->for($group)->for($owner)->create([
            'cycle_period' => $cyclePeriod,
            'status' => 'succeeded',
            'paid_at' => now(),
        ]);

        $result = app(TontinePayoutService::class)->disburse($group, $cyclePeriod);

        $this->assertTrue($result['round_completed']);
        $this->assertSame('completed', $group->fresh()->round_status);
        $this->assertSame(1, GroupCycleRecipient::where('group_id', $group->id)->count());
    }

    public function test_a_passive_get_never_resolves_a_new_recipient_while_the_round_is_locked(): void
    {
        $owner = User::factory()->create();
        $group = Group::factory()->for($owner, 'owner')->create(['frequency' => 'monthly']);
        $group->members()->attach($owner->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);
        Vault::factory()->for($owner)->create();

        $cyclePeriod = $group->currentCyclePeriod();

        Contribution::factory()->for($group)->for($owner)->create([
            'cycle_period' => $cyclePeriod,
            'status' => 'succeeded',
            'paid_at' => now(),
        ]);

        app(TontinePayoutService::class)->disburse($group, $cyclePeriod);
        $this->assertSame('completed', $group->fresh()->round_status);

        // A second, non-owner member — added after the round locked, so they're only ever
        // eligible starting next round, but their GET must still be safe to serve right now.
        $member = User::factory()->create();
        $group->members()->attach($member->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        // Roll the calendar into a new cycle period so a naive resolveFor() would have something
        // new to resolve, if it weren't guarded.
        Carbon::setTestNow(now()->addMonthNoOverflow());

        Sanctum::actingAs($member, ['*']);
        $response = $this->getJson("/api/groups/{$group->id}");

        $response->assertOk();
        $this->assertSame(
            1,
            GroupCycleRecipient::where('group_id', $group->id)->count(),
            'A passive GET must never resolve a new cycle recipient while the round is locked.',
        );

        Carbon::setTestNow();
    }
}
