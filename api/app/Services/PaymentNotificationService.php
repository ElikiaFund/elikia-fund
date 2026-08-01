<?php

namespace App\Services;

use App\Mail\TontinePayoutReceived as TontinePayoutReceivedMail;
use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

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

    public function tontinePayoutReceived(User $user, Group $group, float $amount): void
    {
        $this->notify(
            $user,
            'tontine_payout_received',
            'Versement reçu',
            "Vous avez reçu {$this->money($amount)} de la tontine « {$group->name} », crédité sur votre coffre.",
            $group->id,
        );

        if ($user->email) {
            try {
                Mail::to($user->email)->send(new TontinePayoutReceivedMail($user, $group, $amount));
            } catch (Throwable $e) {
                Log::warning('Tontine payout email failed to send', ['user_id' => $user->id, 'message' => $e->getMessage()]);
            }
        }
    }

    /** Every group member except the payout recipient — transparency for the whole group. */
    public function tontinePayoutBroadcast(Group $group, User $recipient, float $amount): void
    {
        $group->members()->where('users.id', '!=', $recipient->id)->get()->each(
            fn (User $member) => $this->notify(
                $member,
                'tontine_payout_broadcast',
                'Cagnotte versée',
                "La cagnotte du cycle a été versée à {$recipient->name} pour « {$group->name} ».",
                $group->id,
            )
        );
    }

    /**
     * Owner-specific confirmation, sent in addition to the broadcast above (the owner is also a
     * member, so receives that too) — for both manual and automatic payout, since the on-screen
     * success shown after a manual payout is transient but this notification is a persistent record.
     */
    public function tontinePayoutConfirmedForOwner(User $owner, Group $group, ?User $recipient, float $amount): void
    {
        $this->notify(
            $owner,
            'tontine_payout_confirmed',
            'Versement effectué',
            'Vous avez versé '.$this->money($amount).' à '.($recipient->name ?? 'le bénéficiaire')." pour « {$group->name} ».",
            $group->id,
        );
    }

    /**
     * Fired only from the automatic payout path — a cycle is fully funded but blocked because the
     * recipient hasn't activated a vault yet. Deduped per (owner, group, cycle) so a still-blocked
     * cycle doesn't re-notify the owner on every subsequent contribution.
     */
    public function tontinePayoutBlockedNoVault(User $owner, Group $group, User $recipient, string $cyclePeriod): void
    {
        $alreadyNotified = Notification::where('user_id', $owner->id)
            ->where('group_id', $group->id)
            ->where('type', 'tontine_payout_blocked_no_vault')
            ->where('cycle_period', $cyclePeriod)
            ->exists();

        if ($alreadyNotified) {
            return;
        }

        $this->notify(
            $owner,
            'tontine_payout_blocked_no_vault',
            'Versement en attente',
            "{$recipient->name} n'a pas encore activé son coffre. Le versement de « {$group->name} » sera possible dès que ce sera fait.",
            $group->id,
            $cyclePeriod,
        );
    }

    public function tontineRoundCompleted(User $owner, Group $group, int $roundNumber): void
    {
        $this->notify(
            $owner,
            'tontine_round_completed',
            'Tour de tontine terminé',
            "Le tour {$roundNumber} de « {$group->name} » est terminé. Relancez un nouveau tour pour continuer.",
            $group->id,
        );
    }

    private function money(float $amount): string
    {
        return number_format($amount, 0, ',', ' ').' FCFA';
    }

    private function notify(User $user, string $type, string $title, string $body, ?int $groupId = null, ?string $cyclePeriod = null): void
    {
        Notification::create([
            'user_id' => $user->id,
            'group_id' => $groupId,
            'type' => $type,
            'cycle_period' => $cyclePeriod,
            'title' => $title,
            'body' => $body,
        ]);

        if ($user->push_token) {
            $this->expoPush->send($user->push_token, $title, $body, array_filter(['type' => $type, 'group_id' => $groupId]));
        }
    }
}
