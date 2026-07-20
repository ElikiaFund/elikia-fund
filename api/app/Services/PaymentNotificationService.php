<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;

/**
 * Confirms every payment outcome (vault deposit/withdraw, tontine contribution) back to the
 * user who made it — success or failure — via the same in-app notification log + Expo push
 * used for tontine reminders (see TontineNotificationService). Called both from the synchronous
 * controller paths (VaultController, GroupController) and from the webhook resolution path
 * (YabetoWebhookController), so a payment that resolves asynchronously still gets confirmed.
 */
class PaymentNotificationService
{
    public function __construct(private readonly ExpoPushService $expoPush) {}

    public function depositSucceeded(User $user, float $amount): void
    {
        $this->notify($user, 'vault_deposit_succeeded', 'Dépôt réussi', "Votre dépôt de {$this->money($amount)} a été crédité sur votre coffre.");
    }

    public function depositFailed(User $user, float $amount, ?string $reason = null): void
    {
        $this->notify($user, 'vault_deposit_failed', 'Dépôt échoué', $reason ?? "Votre dépôt de {$this->money($amount)} n'a pas pu être effectué.");
    }

    public function withdrawSucceeded(User $user, float $amount): void
    {
        $this->notify($user, 'vault_withdraw_succeeded', 'Retrait réussi', "Votre retrait de {$this->money($amount)} a bien été effectué.");
    }

    public function withdrawFailed(User $user, float $amount, ?string $reason = null): void
    {
        $this->notify($user, 'vault_withdraw_failed', 'Retrait échoué', $reason ?? "Votre retrait de {$this->money($amount)} n'a pas pu être effectué.");
    }

    public function contributionSucceeded(User $user, Group $group, float $amount): void
    {
        $this->notify(
            $user,
            'contribution_succeeded',
            'Cotisation confirmée',
            "Votre cotisation de {$this->money($amount)} pour « {$group->name} » a été confirmée.",
            $group->id,
        );
    }

    public function contributionFailed(User $user, Group $group, float $amount, ?string $reason = null): void
    {
        $this->notify(
            $user,
            'contribution_failed',
            'Cotisation échouée',
            $reason ?? "Votre cotisation de {$this->money($amount)} pour « {$group->name} » n'a pas pu être effectuée.",
            $group->id,
        );
    }

    private function money(float $amount): string
    {
        return number_format($amount, 0, ',', ' ').' FCFA';
    }

    private function notify(User $user, string $type, string $title, string $body, ?int $groupId = null): void
    {
        Notification::create([
            'user_id' => $user->id,
            'group_id' => $groupId,
            'type' => $type,
            'title' => $title,
            'body' => $body,
        ]);

        if ($user->push_token) {
            $this->expoPush->send($user->push_token, $title, $body, array_filter(['type' => $type, 'group_id' => $groupId]));
        }
    }
}
