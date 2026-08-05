<?php

namespace App\Services;

use App\Exceptions\GroupDeletionInProgressException;
use App\Models\Group;
use App\Models\GroupDeletionRequest;
use App\Models\GroupDeletionVote;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Owns the member-approval workflow for deleting a tontine: the owner proposes deletion, every
 * other approved member has 48 hours to approve or decline, and silence at the deadline counts as
 * approval — deletion is only blocked if a strict majority of ALL current members explicitly
 * decline before the window closes (see resolve()'s three-branch tally). A tontine with no
 * members besides the owner deletes immediately, since there's nothing to vote on.
 *
 * Notification dispatch (network I/O — Expo push) always happens *after* the DB::transaction
 * that decides the outcome has committed, never inside it — resolve() returns a plain result
 * array describing what happened instead of notifying itself, and each public method notifies
 * once its transaction closure returns. Approval snapshots the group's name and member list
 * before deleting it, since both are needed for the notification and the cascade-delete wipes
 * the live relations.
 */
class GroupDeletionService
{
    private const VOTING_WINDOW_HOURS = 48;

    public function __construct(private readonly GroupMembershipNotificationService $notifications) {}

    /**
     * @throws GroupDeletionInProgressException if a vote is already pending for this group
     */
    public function requestAndNotify(Group $group, User $requester): GroupDeletionRequest
    {
        [$deletionRequest, $result] = DB::transaction(function () use ($group, $requester) {
            $locked = Group::whereKey($group->id)->lockForUpdate()->firstOrFail();

            if ($locked->deletionRequests()->where('status', 'pending')->exists()) {
                throw new GroupDeletionInProgressException('Une demande de suppression est déjà en cours pour cette tontine.');
            }

            $members = $locked->members()->get();

            $deletionRequest = GroupDeletionRequest::create([
                'group_id' => $locked->id,
                'requested_by' => $requester->id,
                'status' => 'pending',
                'expires_at' => now()->addHours(self::VOTING_WINDOW_HOURS),
            ]);

            GroupDeletionVote::create([
                'group_deletion_request_id' => $deletionRequest->id,
                'user_id' => $requester->id,
                'decision' => 'approved',
                'decided_at' => now(),
            ]);

            $otherMembers = $members->reject(fn (User $member) => $member->id === $requester->id);

            // Nothing else to vote on — delete right away instead of opening a pointless ballot.
            if ($otherMembers->isEmpty()) {
                return [$deletionRequest, $this->approve($deletionRequest, $locked, $members)];
            }

            return [$deletionRequest, ['outcome' => null, 'other_members' => $otherMembers]];
        });

        if ($result['outcome'] === 'approved') {
            $this->notifications->deletionApproved($result['group_name'], $result['members']);
        } else {
            $result['other_members']->each(fn (User $member) => $this->notifications->deletionRequested($group, $requester, $member));
        }

        return $deletionRequest;
    }

    /**
     * @return string|null 'approved' or 'rejected' if this vote resolved the request, null if still pending
     *
     * @throws GroupDeletionInProgressException if the request isn't pending, or the voter is the requester
     */
    public function castVoteAndNotify(GroupDeletionRequest $deletionRequest, User $user, string $decision): ?string
    {
        $result = DB::transaction(function () use ($deletionRequest, $user, $decision) {
            $locked = GroupDeletionRequest::whereKey($deletionRequest->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending') {
                throw new GroupDeletionInProgressException('Ce vote est déjà terminé.');
            }

            if ($locked->requested_by === $user->id) {
                throw new GroupDeletionInProgressException("Vous avez déjà implicitement approuvé en initiant cette demande — utilisez l'annulation pour revenir en arrière.");
            }

            GroupDeletionVote::updateOrCreate(
                ['group_deletion_request_id' => $locked->id, 'user_id' => $user->id],
                ['decision' => $decision, 'decided_at' => now()],
            );

            return $this->resolve($locked);
        });

        $this->notifyResult($result);

        return $result['outcome'];
    }

    public function cancelAndNotify(GroupDeletionRequest $deletionRequest): void
    {
        $group = DB::transaction(function () use ($deletionRequest) {
            $locked = GroupDeletionRequest::whereKey($deletionRequest->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending') {
                throw new GroupDeletionInProgressException("Cette demande n'est plus active.");
            }

            $locked->update(['status' => 'cancelled', 'resolved_at' => now()]);

            return $locked->group;
        });

        $this->notifications->deletionCancelled($group);
    }

    /**
     * Called by the scheduled command for every request whose 48h window has elapsed without an
     * early resolution — forces the deadline branch in resolve() so every non-voter converts to
     * an implicit approval.
     */
    public function resolveExpiredAndNotify(GroupDeletionRequest $deletionRequest): ?string
    {
        $result = DB::transaction(function () use ($deletionRequest) {
            $locked = GroupDeletionRequest::whereKey($deletionRequest->id)->lockForUpdate()->firstOrFail();

            if ($locked->status !== 'pending') {
                return ['outcome' => null];
            }

            return $this->resolve($locked, forceDeadline: true);
        });

        $this->notifyResult($result);

        return $result['outcome'];
    }

    private function notifyResult(array $result): void
    {
        if ($result['outcome'] === 'approved') {
            $this->notifications->deletionApproved($result['group_name'], $result['members']);
        } elseif ($result['outcome'] === 'rejected') {
            $this->notifications->deletionRejected($result['group']);
        }
    }

    /**
     * The tally: a strict majority of ALL current members must explicitly decline to block
     * deletion — anything else (an explicit approve majority, or the 48h deadline arriving
     * without one) resolves to approval. Must be called from within a transaction with the
     * request row already locked. Pure decision + persistence — never dispatches notifications
     * itself, see the class docblock.
     *
     * @param  bool  $forceDeadline  true only from resolveExpiredAndNotify(), for a request the
     *                               caller has already confirmed is past its expires_at — lets the
     *                               deadline branch fire deterministically rather than re-deriving
     *                               "is it past expiry" here too.
     * @return array{outcome: string|null, group_name?: string, members?: Collection, group?: Group}
     */
    private function resolve(GroupDeletionRequest $deletionRequest, bool $forceDeadline = false): array
    {
        $group = $deletionRequest->group;
        $members = $group->members()->get();
        $total = $members->count();

        $votes = $deletionRequest->votes()->get();
        $approved = $votes->where('decision', 'approved')->count();
        $declined = $votes->where('decision', 'declined')->count();

        if ($declined > $total / 2) {
            $deletionRequest->update(['status' => 'rejected', 'resolved_at' => now()]);

            return ['outcome' => 'rejected', 'group' => $group];
        }

        if ($approved > $total / 2 || $forceDeadline) {
            return $this->approve($deletionRequest, $group, $members);
        }

        return ['outcome' => null];
    }

    /**
     * @return array{outcome: 'approved', group_name: string, members: Collection}
     */
    private function approve(GroupDeletionRequest $deletionRequest, Group $group, Collection $members): array
    {
        $deletionRequest->update(['status' => 'approved', 'resolved_at' => now()]);
        $groupName = $group->name;
        $group->delete();

        return ['outcome' => 'approved', 'group_name' => $groupName, 'members' => $members];
    }
}
