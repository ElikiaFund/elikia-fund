<?php

namespace App\Services;

use App\Exceptions\ContributionInProgressException;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use Illuminate\Http\Client\ConnectionException;
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
    public function __construct(private readonly YabetoService $yabeto) {}

    /**
     * @param  array{fee_amount: float, provider_fee_amount: float, platform_fee_amount: float, net_amount: float}  $fee
     *                                                                                                                    FeeService::contribution()'s return shape
     *
     * @throws ContributionInProgressException if a succeeded/processing contribution already
     *                                         exists for this (group, user, cycle_period) — a prior failed attempt never blocks a retry
     */
    public function reserve(
        Group $group,
        User $user,
        string $cyclePeriod,
        float $amount,
        array $fee,
        string $status,
        ?string $provider = null,
        ?int $recordedBy = null,
    ): Contribution {
        // Best-effort, outside any lock: if the member's last attempt for this cycle is stuck
        // `processing` (the webhook never arrived, or the original request hit a transport error
        // and never got a clean resolution — see VaultTransactionService's equivalent), ask
        // Yabeto directly before deciding to block a retry on it. Otherwise a genuinely dead
        // attempt would block every future contribution for this cycle until the scheduled
        // payments:reconcile-pending sweep eventually catches it (up to 15 minutes later).
        $this->reconcileStuck($group, $user, $cyclePeriod);

        return DB::transaction(function () use ($group, $user, $cyclePeriod, $amount, $fee, $status, $provider, $recordedBy) {
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
                'fee_amount' => $fee['fee_amount'],
                'provider_fee_amount' => $fee['provider_fee_amount'],
                'platform_fee_amount' => $fee['platform_fee_amount'],
                'net_amount' => $fee['net_amount'],
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

    /**
     * If this member's most recent contribution for this cycle is stuck `processing` and Yabeto
     * can now tell us what actually happened, resolve it before reserve()'s guard ever sees it —
     * turning "blocked forever until someone remembers to check" into "self-heals on the very
     * next attempt". Deliberately outside any lock/transaction (a live HTTP call has no business
     * holding a row lock); a still-genuinely-processing or unreachable-Yabeto outcome just leaves
     * the row as-is, and reserve() blocks exactly as before.
     */
    private function reconcileStuck(Group $group, User $user, string $cyclePeriod): void
    {
        if (! $this->yabeto->isEnabled()) {
            return;
        }

        $stuck = Contribution::where('group_id', $group->id)
            ->where('user_id', $user->id)
            ->where('cycle_period', $cyclePeriod)
            ->where('status', 'processing')
            ->whereNotNull('yabeto_reference')
            ->first();

        if (! $stuck) {
            return;
        }

        try {
            $result = $this->yabeto->getPaymentIntent($stuck->yabeto_reference);
        } catch (YabetoRequestException|ConnectionException) {
            return;
        }

        if ($result->status !== 'processing') {
            $this->resolveStatus($stuck->id, $result->status);
        }
    }
}
