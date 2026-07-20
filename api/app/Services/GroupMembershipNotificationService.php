<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;

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

    private function notify(User $user, Group $group, string $type, string $title, string $body): void
    {
        Notification::create([
            'user_id' => $user->id,
            'group_id' => $group->id,
            'type' => $type,
            'title' => $title,
            'body' => $body,
        ]);

        if ($user->push_token) {
            $this->expoPush->send($user->push_token, $title, $body, ['type' => $type, 'group_id' => $group->id]);
        }
    }
}
