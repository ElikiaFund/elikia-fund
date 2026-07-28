<?php

namespace App\Services;

use App\Models\CashSession;
use App\Models\User;
use Carbon\Carbon;

/**
 * Computes the live, authoritative "expected balance" a cash session should reconcile against —
 * live-computed, never stale-cached, same philosophy as CreditScoreService/TontineReportService.
 * The period is rolling from the last closed session (or the beginning of time if none exists
 * yet), not a calendar-aligned boundary — closing late reconciles everything since the user last
 * counted, exactly like a physical till.
 */
class CashSessionService
{
    public function lastSession(User $user): ?CashSession
    {
        return $user->cashSessions()->latest('closed_at')->first();
    }

    public function expectedBalance(User $user, ?Carbon $asOf = null): float
    {
        $asOf ??= now();
        $last = $this->lastSession($user);

        $sum = $user->transactions()
            ->when($last, fn ($query) => $query->where('occurred_at', '>', $last->closed_at))
            ->where('occurred_at', '<=', $asOf)
            ->get()
            ->sum(fn ($transaction) => $transaction->type === 'income' ? (float) $transaction->amount : -(float) $transaction->amount);

        return (float) ($last->counted_balance ?? 0) + $sum;
    }
}
