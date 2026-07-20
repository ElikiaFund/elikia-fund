<?php

namespace App\Services;

use App\Models\Group;
use Carbon\Carbon;

/**
 * Computes a tontine cycle report live from contributions/members data — same "computed, not
 * cached" pattern as CreditScoreService, for the same reason: the underlying data (who paid,
 * who's late) changes with every contribution, so a stored report would just go stale.
 */
class TontineReportService
{
    public function generate(Group $group, ?string $cyclePeriod = null): array
    {
        $cyclePeriod ??= $group->previousCyclePeriod();
        $cycleEnd = $group->cycleBoundsFor($cyclePeriod)['end'];

        // Only `succeeded` contributions count as "paid" — a failed or still-`processing` Yabeto
        // attempt isn't money in hand yet, see GroupController::contribute().
        $contributions = $group->contributions()->where('cycle_period', $cyclePeriod)->where('status', 'succeeded')->with('user')->get();
        $paidUserIds = $contributions->pluck('user_id');

        // Only members who had already joined by the time this cycle ended are "eligible" for
        // it — otherwise a member who joins today shows up as "late" for every cycle that
        // happened before they were even part of the tontine.
        $members = $group->members->filter(
            fn ($member) => $member->pivot->approved_at && Carbon::parse($member->pivot->approved_at)->lte($cycleEnd)
        );
        $lateMembers = $members->whereNotIn('id', $paidUserIds);

        return [
            'group_id' => $group->id,
            'group_name' => $group->name,
            'frequency' => $group->frequency,
            'cycle_period' => $cyclePeriod,
            'starts_at' => $group->cycleBoundsFor($cyclePeriod)['start']->toDateString(),
            'ends_at' => $cycleEnd->toDateString(),
            'members_count' => $members->count(),
            'paid_count' => $paidUserIds->unique()->count(),
            'late_count' => $lateMembers->count(),
            'total_collected' => (float) $contributions->sum('amount'),
            'total_fees' => (float) $contributions->sum('fee_amount'),
            'total_net' => (float) $contributions->sum('net_amount'),
            'contributions' => $contributions->map(fn ($contribution) => [
                'user_id' => $contribution->user_id,
                'user_name' => $contribution->user->name,
                'amount' => (float) $contribution->amount,
                'fee_amount' => (float) $contribution->fee_amount,
                'net_amount' => (float) $contribution->net_amount,
                'paid_at' => $contribution->paid_at,
            ])->values(),
            'late_members' => $lateMembers->map(fn ($member) => [
                'id' => $member->id,
                'name' => $member->name,
            ])->values(),
        ];
    }
}
