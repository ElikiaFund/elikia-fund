<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;
use Illuminate\Database\Eloquent\Collection;

/**
 * Notifies the group owner of new join requests, and the requester of the approve/decline
 * outcome — the same in-app notification log + Expo push pattern used for payment outcomes
 * (see PaymentNotificationService) and tontine reminders (see TontineNotificationService).
 */
class GroupMembershipNotificationService
{
    public function __construct(private readonly ExpoPushService $expoPush) {}

    public function joinRequested(Group $group, User $requester): void
    {
        if (! $group->owner) {
            return;
        }

        $this->notify(
            $group->owner,
            $group,
            'join_requested',
            'Nouvelle demande d\'adhésion',
            "{$requester->name} souhaite rejoindre « {$group->name} ».",
        );
    }

    public function joinApproved(User $requester, Group $group): void
    {
        $this->notify(
            $requester,
            $group,
            'join_approved',
            'Demande approuvée',
            "Vous avez rejoint « {$group->name} ». Vous pouvez maintenant cotiser.",
        );
    }

    public function joinDeclined(User $requester, Group $group): void
    {
        $this->notify(
            $requester,
            $group,
            'join_declined',
            'Demande refusée',
            "Votre demande pour rejoindre « {$group->name} » a été refusée.",
        );
    }

    /**
     * Broadcast to every member whenever the rotation order changes — this codebase deliberately
     * doesn't lock recipient_order against being changed (a resolved cycle is immutable regardless
     * of later reordering, so there's nothing to exploit), but members previously had no way to
     * know if/when it changed. Visibility, not restriction, is the fix.
     */
    public function recipientOrderChanged(Group $group, User $changedBy): void
    {
        $group->members()->get()->each(
            fn (User $member) => $this->notify(
                $member,
                $group,
                'tontine_recipient_order_changed',
                'Ordre de passage modifié',
                "{$changedBy->name} a modifié l'ordre de passage de « {$group->name} ».",
            )
        );
    }

    /** Broadcast to every member whenever a cycle's recipient is first decided or manually overridden — same transparency rationale as recipientOrderChanged(). */
    public function recipientDecided(Group $group, User $recipient): void
    {
        $group->members()->get()->each(
            fn (User $member) => $this->notify(
                $member,
                $group,
                'tontine_recipient_decided',
                'Bénéficiaire désigné',
                "{$recipient->name} est désigné comme bénéficiaire du cycle de « {$group->name} ».",
            )
        );
    }

    public function memberRemoved(User $removedMember, Group $group): void
    {
        $this->notify(
            $removedMember,
            $group,
            'tontine_member_removed',
            'Retiré de la tontine',
            "Vous avez été retiré de « {$group->name} » par le créateur.",
        );
    }

    /** Called after the status flip, on a fresh members() query — the removed user is already excluded. */
    public function memberRemovedBroadcast(Group $group, User $removedMember): void
    {
        $group->members()->get()->each(
            fn (User $member) => $this->notify(
                $member,
                $group,
                'tontine_member_removed_broadcast',
                'Membre retiré',
                "{$removedMember->name} a été retiré de « {$group->name} ».",
            )
        );
    }

    /**
     * Proposing owner-only action — broadcasts to every OTHER approved member (the requester's
     * own vote is implicit, see GroupDeletionService::requestAndNotify(), so they're never passed
     * in as $recipient here).
     */
    public function deletionRequested(Group $group, User $requester, User $recipient): void
    {
        $this->notify(
            $recipient,
            $group,
            'tontine_deletion_requested',
            'Demande de suppression de la tontine',
            "{$requester->name} propose de supprimer « {$group->name} ». Vous avez 48h pour approuver ou refuser — sans réponse de votre part, la suppression sera automatiquement approuvée.",
        );
    }

    /**
     * The group row is already gone by the time this fires (GroupDeletionService deletes it
     * before dispatching notifications) — $members is the snapshot taken just before, and there's
     * no Group left to attach the notification to, hence the null group.
     */
    public function deletionApproved(string $groupName, Collection $members): void
    {
        $members->each(fn (User $member) => $this->notify(
            $member,
            null,
            'tontine_deletion_approved',
            'Tontine supprimée',
            "« {$groupName} » a été supprimée à la suite du vote des membres.",
        ));
    }

    public function deletionRejected(Group $group): void
    {
        $group->members()->get()->each(fn (User $member) => $this->notify(
            $member,
            $group,
            'tontine_deletion_rejected',
            'Suppression refusée',
            "La demande de suppression de « {$group->name} » a été refusée par les membres. La tontine continue normalement.",
        ));
    }

    public function deletionCancelled(Group $group): void
    {
        $group->members()->get()->each(fn (User $member) => $this->notify(
            $member,
            $group,
            'tontine_deletion_cancelled',
            'Demande de suppression annulée',
            "Le créateur a annulé la demande de suppression de « {$group->name} ».",
        ));
    }

    private function notify(User $user, ?Group $group, string $type, string $title, string $body): void
    {
        Notification::create([
            'user_id' => $user->id,
            'group_id' => $group?->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
        ]);

        if ($user->push_token) {
            $this->expoPush->send($user->push_token, $title, $body, array_filter(['type' => $type, 'group_id' => $group?->id]));
        }
    }
}
