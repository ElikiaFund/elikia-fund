<?php

namespace App\Services;

use App\Exceptions\TontinePayoutException;
use App\Exceptions\TontinePayoutRecipientVaultNotActivatedException;
use App\Models\Group;
use App\Models\GroupCycleRecipient;
use App\Models\VaultMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Disburses a tontine cycle's pooled contributions to that cycle's recipient — straight into
 * their vault, not out to a real mobile money number, deliberately: unlike a vault withdrawal
 * (initiated by the account holder themselves, who types in a phone number at that moment), a
 * payout is triggered by the group owner on someone else's behalf, and there's no reliable
 * mobile money number to send it to (a user's login `phone` isn't guaranteed to be one). Crediting
 * the vault also means the recipient can withdraw immediately through the existing, already-secure
 * withdraw flow if they want cash right away, or leave it as savings — both of which feed the
 * credit score's savings_behavior factor, unlike money that just leaves the system.
 *
 * Mirrors ProductStockService's shape: guard checks, then a single DB::transaction() that mutates
 * the running balance and writes the audit-trail row together.
 *
 * disburseAndNotify()/disburseIfEligibleAndNotify() are the two public entry points — manual
 * (owner-initiated) and automatic (fired speculatively after every contribution success) payout
 * both funnel through the exact same disburse() core and the exact same notifyPayoutOutcome(), so
 * there is exactly one place notification-on-payout logic lives.
 */
class TontinePayoutService
{
    public function __construct(
        private readonly GroupCycleRecipientService $cycleRecipients,
        private readonly PaymentNotificationService $paymentNotifications,
    ) {}

    /**
     * Manual, owner-initiated — throws on any ineligibility reason.
     *
     * @return array{recipient: GroupCycleRecipient, movement: VaultMovement, amount: float, round_completed: bool}
     */
    public function disburseAndNotify(Group $group, string $cyclePeriod): array
    {
        $result = $this->disburse($group, $cyclePeriod);
        $this->notifyPayoutOutcome($group, $result);

        return $result;
    }

    /**
     * Automatic — safe to call speculatively after every contribution success. Returns null if
     * auto-payout is disabled for this group, or if the cycle isn't eligible yet (silent — will
     * naturally resolve on a later contribution). The vault-not-activated case is handled here
     * (owner nudge) rather than bubbling out, since every call site needs the same handling.
     *
     * @return array{recipient: GroupCycleRecipient, movement: VaultMovement, amount: float, round_completed: bool}|null
     */
    public function disburseIfEligibleAndNotify(Group $group, string $cyclePeriod): ?array
    {
        if (! $group->auto_payout_enabled) {
            return null;
        }

        try {
            $result = $this->disburse($group, $cyclePeriod);
        } catch (TontinePayoutRecipientVaultNotActivatedException $e) {
            if ($group->owner) {
                $this->paymentNotifications->tontinePayoutBlockedNoVault($group->owner, $group, $e->recipient, $cyclePeriod);
            }

            return null;
        } catch (TontinePayoutException) {
            return null;
        }

        $this->notifyPayoutOutcome($group, $result);

        return $result;
    }

    /**
     * @return array{recipient: GroupCycleRecipient, movement: VaultMovement, amount: float, round_completed: bool}
     */
    public function disburse(Group $group, string $cyclePeriod): array
    {
        if ($group->isRoundLocked()) {
            throw new TontinePayoutException('Ce tour de tontine est terminé. Le créateur doit relancer un nouveau tour avant tout nouveau versement.');
        }

        // Ensures a row exists before we try to lock it. A genuine race between two concurrent
        // first-time resolutions is still safe — group_cycle_recipients has a unique constraint
        // on (group_id, cycle_period), so the loser of that race fails loudly instead of
        // silently duplicating.
        $this->cycleRecipients->resolveFor($group, $cyclePeriod);

        return DB::transaction(function () use ($group, $cyclePeriod) {
            /** @var GroupCycleRecipient $cycleRecipient */
            $cycleRecipient = GroupCycleRecipient::where('group_id', $group->id)
                ->where('cycle_period', $cyclePeriod)
                ->lockForUpdate()
                ->firstOrFail();

            if ($cycleRecipient->paid_out_at !== null) {
                throw new TontinePayoutException('Ce cycle a déjà été versé.');
            }

            if (! $cycleRecipient->user_id) {
                throw new TontinePayoutException("Aucun bénéficiaire n'est désigné pour ce cycle.");
            }

            $recipient = $cycleRecipient->user;

            if (! $recipient || ! $group->members()->where('users.id', $recipient->id)->exists()) {
                throw new TontinePayoutException("Le bénéficiaire désigné n'est plus membre de cette tontine.");
            }

            // Same "approved by the time this cycle closed" eligibility rule as GroupController::cycles()
            // — a member who joined after this cycle ended was never expected to have paid into it.
            $bounds = $group->cycleBoundsFor($cyclePeriod);
            $eligibleMemberIds = $group->members
                ->filter(fn ($member) => $member->pivot->approved_at && Carbon::parse($member->pivot->approved_at)->lte($bounds['end']))
                ->pluck('id');

            $paidUserIds = $group->contributions()
                ->where('cycle_period', $cyclePeriod)
                ->where('status', 'succeeded')
                ->pluck('user_id')
                ->unique();

            if ($eligibleMemberIds->isEmpty() || $eligibleMemberIds->diff($paidUserIds)->isNotEmpty()) {
                throw new TontinePayoutException("Tous les membres n'ont pas encore cotisé pour ce cycle.");
            }

            $amount = (float) $group->contributions()
                ->where('cycle_period', $cyclePeriod)
                ->where('status', 'succeeded')
                ->sum('net_amount');

            if ($amount <= 0) {
                throw new TontinePayoutException('Aucune cotisation à verser pour ce cycle.');
            }

            // The payout lands in the tontine's own company's vault, not the recipient member's
            // personal vault — recipient *selection* (who's up next in rotation) is unaffected,
            // but the money is attributed to the business the tontine itself belongs to.
            $vault = $group->company->vault;

            if (! $vault) {
                throw new TontinePayoutRecipientVaultNotActivatedException(
                    $group,
                    $recipient,
                    "L'entreprise « {$group->company->name} » n'a pas encore activé son coffre. Le versement sera possible dès que ce sera fait.",
                );
            }

            $vault->increment('balance', $amount);

            $movement = $vault->movements()->create([
                'type' => 'tontine_payout',
                'amount' => $amount,
                'note' => "Versement de la tontine « {$group->name} », cycle {$cyclePeriod}.",
                'status' => 'completed',
                'group_id' => $group->id,
                'cycle_period' => $cyclePeriod,
            ]);

            $cycleRecipient->update(['paid_out_at' => now(), 'vault_movement_id' => $movement->id]);

            $roundCompleted = $this->completeRoundIfDone($group);

            return [
                'recipient' => $cycleRecipient->fresh()->load('user'),
                'movement' => $movement->fresh(),
                'amount' => $amount,
                'round_completed' => $roundCompleted,
            ];
        });
    }

    /**
     * Flips the group's round to 'completed' once every currently-approved member has received
     * exactly one payout in the current round — checked against the *live* member count, not a
     * snapshot taken at round start (a deliberate, accepted simplification consistent with how
     * cycleProgress() already computes eligibility live elsewhere in this codebase; a mid-round
     * joiner/leaver shifts the goalposts slightly, which is fine for this pass).
     */
    private function completeRoundIfDone(Group $group): bool
    {
        if ($group->round_status === 'completed') {
            return false;
        }

        $liveMemberCount = $group->members()->count();

        if ($liveMemberCount === 0) {
            return false;
        }

        $distinctPaid = GroupCycleRecipient::where('group_id', $group->id)
            ->where('round_number', $group->round_number)
            ->whereNotNull('paid_out_at')
            ->distinct()
            ->count('user_id');

        if ($distinctPaid < $liveMemberCount) {
            return false;
        }

        $group->update(['round_status' => 'completed']);

        return true;
    }

    /**
     * @param  array{recipient: GroupCycleRecipient, movement: VaultMovement, amount: float, round_completed: bool}  $result
     */
    private function notifyPayoutOutcome(Group $group, array $result): void
    {
        $recipient = $result['recipient']->user;

        if ($recipient) {
            $this->paymentNotifications->tontinePayoutReceived($recipient, $group, $result['amount']);
            $this->paymentNotifications->tontinePayoutBroadcast($group, $recipient, $result['amount']);
        }

        if ($group->owner) {
            $this->paymentNotifications->tontinePayoutConfirmedForOwner($group->owner, $group, $recipient, $result['amount']);

            if ($result['round_completed']) {
                $this->paymentNotifications->tontineRoundCompleted($group->owner, $group, $group->round_number);
            }
        }
    }
}
