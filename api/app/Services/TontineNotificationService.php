<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;

/**
 * Domain logic behind the automated tontine alert system: contribution reminders before a
 * cycle closes, late-payment alerts once it has, and a "your cycle report is ready" nudge to
 * the group owner. Every send is logged to `notifications` first — that log is also what makes
 * each of these idempotent, since the artisan commands that drive this run daily and must not
 * re-notify someone who was already told.
 */
class TontineNotificationService
{
    /** How many days before a cycle closes a still-unpaid member gets reminded. */
    private const REMINDER_WINDOW_DAYS = 3;

    public function __construct(private readonly ExpoPushService $expoPush) {}

    /**
     * Reminds members who haven't paid the current cycle, once the cycle is within its final
     * REMINDER_WINDOW_DAYS days. Returns how many reminders were actually sent (skips anyone
     * already reminded for this exact group+cycle).
     */
    public function sendReminders(Group $group): int
    {
        if (! $this->isWithinReminderWindow($group)) {
            return 0;
        }

        $cyclePeriod = $group->currentCyclePeriod();
        $unpaidMembers = $this->unpaidMembersFor($group, $cyclePeriod);
        $sent = 0;

        foreach ($unpaidMembers as $member) {
            if ($this->alreadyNotified($member, $group, 'contribution_reminder', $cyclePeriod)) {
                continue;
            }

            $this->notify(
                $member,
                $group,
                'contribution_reminder',
                $cyclePeriod,
                'Rappel de cotisation',
                "N'oubliez pas de cotiser pour la tontine « {$group->name} » avant la fin du cycle.",
            );
            $sent++;
        }

        return $sent;
    }

    /**
     * Alerts members who missed the cycle that just closed, plus a summary to the owner if any
     * did. Only fires once the group has actually completed at least one cycle since creation.
     */
    public function sendLateAlerts(Group $group): int
    {
        $previousPeriod = $group->previousCyclePeriod();

        if (! $this->hadCompletedACycle($group, $previousPeriod)) {
            return 0;
        }

        $lateMembers = $this->unpaidMembersFor($group, $previousPeriod);
        $sent = 0;

        foreach ($lateMembers as $member) {
            if ($this->alreadyNotified($member, $group, 'late_payment', $previousPeriod)) {
                continue;
            }

            $this->notify(
                $member,
                $group,
                'late_payment',
                $previousPeriod,
                'Cotisation en retard',
                "Votre cotisation pour la tontine « {$group->name} » n'a pas été reçue pour la période précédente.",
            );
            $sent++;
        }

        if ($sent > 0 && $group->owner && ! $this->alreadyNotified($group->owner, $group, 'late_payment_summary', $previousPeriod)) {
            $this->notify(
                $group->owner,
                $group,
                'late_payment_summary',
                $previousPeriod,
                'Retards de cotisation',
                "{$sent} membre(s) n'ont pas cotisé pour la dernière période de « {$group->name} ».",
            );
        }

        return $sent;
    }

    /**
     * Notifies the group owner that the previous cycle's report is ready to view, once per
     * group+cycle. Returns whether a notification was actually sent.
     */
    public function sendCycleReportNotification(Group $group): bool
    {
        $previousPeriod = $group->previousCyclePeriod();

        if (! $this->hadCompletedACycle($group, $previousPeriod) || ! $group->owner) {
            return false;
        }

        if ($this->alreadyNotified($group->owner, $group, 'cycle_report', $previousPeriod)) {
            return false;
        }

        $this->notify(
            $group->owner,
            $group,
            'cycle_report',
            $previousPeriod,
            'Rapport de tontine disponible',
            "Le rapport de cycle de « {$group->name} » est prêt à être consulté.",
        );

        return true;
    }

    private function unpaidMembersFor(Group $group, string $cyclePeriod)
    {
        $paidUserIds = $group->contributions()
            ->where('cycle_period', $cyclePeriod)
            ->where('status', 'succeeded')
            ->pluck('user_id');

        return $group->members()->whereNotIn('users.id', $paidUserIds)->get();
    }

    /**
     * Whether the group has been around long enough for `$previousPeriod` to be a real, elapsed
     * cycle — otherwise a group created mid-cycle would immediately look "late" for a period
     * that predates it.
     */
    private function hadCompletedACycle(Group $group, string $previousPeriod): bool
    {
        if ($group->contributions()->where('cycle_period', $previousPeriod)->exists()) {
            return true;
        }

        $cycleLength = $group->frequency === 'weekly' ? now()->subWeek() : now()->subMonthNoOverflow();

        return $group->created_at->lessThan($cycleLength);
    }

    private function isWithinReminderWindow(Group $group): bool
    {
        $daysRemaining = now()->diffInDays($group->cycleEndsAt(), false);

        return $daysRemaining >= 0 && $daysRemaining <= self::REMINDER_WINDOW_DAYS;
    }

    private function alreadyNotified(User $user, Group $group, string $type, string $cyclePeriod): bool
    {
        return Notification::where('user_id', $user->id)
            ->where('group_id', $group->id)
            ->where('type', $type)
            ->where('cycle_period', $cyclePeriod)
            ->exists();
    }

    private function notify(User $user, Group $group, string $type, string $cyclePeriod, string $title, string $body): void
    {
        Notification::create([
            'user_id' => $user->id,
            'group_id' => $group->id,
            'type' => $type,
            'cycle_period' => $cyclePeriod,
            'title' => $title,
            'body' => $body,
        ]);

        if ($user->push_token) {
            $this->expoPush->send($user->push_token, $title, $body, ['type' => $type, 'group_id' => $group->id]);
        }
    }
}
