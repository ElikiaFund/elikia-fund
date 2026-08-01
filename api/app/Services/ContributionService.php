<?php

namespace App\Services;

use App\Exceptions\ContributionInProgressException;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Owns every Contribution row's creation and post-creation status resolution — mirrors
 * VaultTransactionService. reserve() locks the Group row (serializing concurrent contribute()
 * calls for that one group — coarser than per-member, but tontines are low-frequency enough that
 * this is a non-issue) and creates the row *before* Yabeto is ever called, so a transport failure
 * still leaves a durable local record instead of the previous code's post-response-only write.
 */
class ContributionService
{
    /**
     * @throws ContributionInProgressException if a succeeded/processing contribution already
     *                                         exists for this (group, user, cycle_period) — a prior failed attempt never blocks a retry
     */
    public function reserve(
        Group $group,
        User $user,
        string $cyclePeriod,
        float $amount,
        float $feeAmount,
        string $status,
        ?string $provider = null,
        ?int $recordedBy = null,
    ): Contribution {
        return DB::transaction(function () use ($group, $user, $cyclePeriod, $amount, $feeAmount, $status, $provider, $recordedBy) {
            Group::whereKey($group->id)->lockForUpdate()->firstOrFail();

            $existing = Contribution::where('group_id', $group->id)
                ->where('user_id', $user->id)
                ->where('cycle_period', $cyclePeriod)
                ->whereIn('status', ['succeeded', 'processing'])
                ->first();

            if ($existing?->status === 'succeeded') {
                throw new ContributionInProgressException('Vous avez déjà cotisé pour ce cycle.');
            }

            if ($existing?->status === 'processing') {
                throw new ContributionInProgressException('Une cotisation est déjà en cours de confirmation pour ce cycle.');
            }

            return Contribution::create([
                'group_id' => $group->id,
                'user_id' => $user->id,
                'amount' => $amount,
                'fee_amount' => $feeAmount,
                'net_amount' => $amount - $feeAmount,
                'cycle_period' => $cyclePeriod,
                'paid_at' => now(),
                'provider' => $provider,
                'status' => $status,
                'recorded_by' => $recordedBy,
            ]);
        });
    }

    /**
     * The only place a contribution's status is ever mutated after creation — used by both the
     * webhook resolution path and the manual refresh-status fallback, closing the unlocked
     * read-then-mutate race both previously had. No-op (returns null) if the row is already in
     * the requested status or doesn't exist.
     */
    public function resolveStatus(int $contributionId, string $newStatus): ?Contribution
    {
        return DB::transaction(function () use ($contributionId, $newStatus) {
            /** @var Contribution|null $contribution */
            $contribution = Contribution::where('id', $contributionId)->lockForUpdate()->first();

            if (! $contribution || $contribution->status === $newStatus) {
                return null;
            }

            $contribution->update(['status' => $newStatus]);

            return $contribution->fresh();
        });
    }
}
