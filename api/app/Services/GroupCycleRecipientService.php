<?php

namespace App\Services;

use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Determines who benefits from a reception cycle's pooled contributions — a concept distinct
 * from the contribution cycle (who has paid in, already modeled via Group::currentCyclePeriod()
 * and Contribution::cycle_period). Implements the four recipient_mode algorithms; the outcome is
 * persisted the first time it's resolved so rotation position and random draws stay stable
 * across requests instead of being recomputed (and potentially changing) on every call.
 */
class GroupCycleRecipientService
{
    public function __construct(private readonly GroupMembershipNotificationService $membershipNotifications) {}

    public function resolveFor(Group $group, string $cyclePeriod): GroupCycleRecipient
    {
        $existing = GroupCycleRecipient::where('group_id', $group->id)
            ->where('cycle_period', $cyclePeriod)
            ->first();

        if ($existing) {
            return $existing;
        }

        // Never meant to be caught — a signal that a caller forgot to guard against a locked
        // round before reaching here. Resolving a new recipient while locked would consume a real
        // rotation slot for a cycle that shouldn't exist yet, corrupting the next round's order.
        // Every real call site (GroupController::withCycleStatus/previewPayout/designateRecipient,
        // TontinePayoutService::disburse) must check Group::isRoundLocked() first.
        if ($group->round_status === 'completed') {
            throw new \LogicException(
                "resolveFor() called for a locked round (group #{$group->id}) — callers must check Group::isRoundLocked() first.",
            );
        }

        $members = $group->members()->orderBy('group_members.joined_at')->get();

        $userId = match ($group->recipient_mode) {
            'predefined' => $this->predefined($group, $members),
            'random' => $this->random($group, $members),
            'admin' => null,
            // Goal-based tontine — the pot always goes to the creator, never rotates. See
            // TontinePayoutService::completeRoundIfDone() for the matching round-completion fork.
            'creator' => $group->owner_id,
            default => $this->joinOrder($group, $members),
        };

        $cycleRecipient = GroupCycleRecipient::create([
            'group_id' => $group->id,
            'cycle_period' => $cyclePeriod,
            'user_id' => $userId,
            'method' => $group->recipient_mode,
            'decided_at' => $userId ? now() : null,
            'round_number' => $group->round_number,
        ]);

        if ($userId) {
            $recipient = $members->firstWhere('id', $userId);

            if ($recipient) {
                $this->membershipNotifications->recipientDecided($group, $recipient);
            }
        }

        return $cycleRecipient;
    }

    /**
     * Owner-only manual designation (recipient_mode = 'admin', the only mode with no automatic
     * pick). Also usable to override an already-resolved automatic pick if the owner needs to.
     */
    public function designate(Group $group, string $cyclePeriod, User $recipient): GroupCycleRecipient
    {
        $cycleRecipient = GroupCycleRecipient::updateOrCreate(
            ['group_id' => $group->id, 'cycle_period' => $cyclePeriod],
            ['user_id' => $recipient->id, 'method' => 'admin', 'decided_at' => now(), 'round_number' => $group->round_number],
        );

        $this->membershipNotifications->recipientDecided($group, $recipient);

        return $cycleRecipient;
    }

    /** How many cycles have already had a recipient picked — the rotation's current position. */
    private function rotationIndex(Group $group): int
    {
        return GroupCycleRecipient::where('group_id', $group->id)->whereNotNull('user_id')->count();
    }

    /**
     * 1. Rotation prédéfinie — the creator fixes the member order up front; each cycle advances
     * one position through it. Falls back to join order if the stored sequence doesn't match the
     * group's current membership (never customized, or membership changed since it was set).
     */
    private function predefined(Group $group, Collection $members): ?int
    {
        $order = collect($group->recipient_order ?? []);
        $memberIds = $members->pluck('id');

        if ($order->isEmpty() || $order->sort()->values()->all() !== $memberIds->sort()->values()->all()) {
            return $this->joinOrder($group, $members);
        }

        return $order->values()[$this->rotationIndex($group) % $order->count()];
    }

    /** 2. Rotation par arrivée — order derived live from when each member joined the tontine. */
    private function joinOrder(Group $group, Collection $members): ?int
    {
        if ($members->isEmpty()) {
            return null;
        }

        $ids = $members->pluck('id')->values();

        return $ids[$this->rotationIndex($group) % $ids->count()];
    }

    /**
     * 3. Tirage au sort — a member is drawn at random and excluded from the pool until every
     * other member has also received once, at which point the pool resets.
     */
    private function random(Group $group, Collection $members): ?int
    {
        if ($members->isEmpty()) {
            return null;
        }

        $memberIds = $members->pluck('id');

        $recentlyReceived = GroupCycleRecipient::where('group_id', $group->id)
            ->whereNotNull('user_id')
            ->latest('id')
            ->take(max($memberIds->count() - 1, 0))
            ->pluck('user_id');

        $pool = $memberIds->diff($recentlyReceived);

        if ($pool->isEmpty()) {
            $pool = $memberIds;
        }

        return $pool->random();
    }
}
