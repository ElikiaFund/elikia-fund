<?php

namespace App\Console\Commands;

use App\Models\Contribution;
use App\Models\VaultMovement;
use App\Services\ContributionService;
use App\Services\Payment\DTOs\DisbursementResult;
use App\Services\Payment\DTOs\PaymentIntentResult;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\Payment\YabetoStatus;
use App\Services\PaymentNotificationService;
use App\Services\TontinePayoutService;
use App\Services\VaultTransactionService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\ConnectionException;

/**
 * Actively resolves vault deposits/withdrawals and tontine contributions stuck `processing` —
 * the webhook is the normal confirmation path, but if it never arrives (never registered, or
 * Yabeto never actually received the request — see yabeto.md §9 item 5a's documented gap), a row
 * would otherwise stay `processing` forever, which also permanently blocks the same user/vault
 * from retrying (ContributionService::reserve()/VaultTransactionService::deposit()/withdraw()
 * all refuse a new attempt while a `processing` row already exists for that user/vault). Give
 * Yabeto a head start (REFRESH_AFTER_MINUTES) before even asking — most resolve via the webhook
 * within seconds — then ask directly; if Yabeto itself still can't resolve it after a much longer
 * window (ABANDON_AFTER_HOURS), treat it as abandoned rather than leave the user blocked
 * indefinitely: deposits and contributions are marked failed (no money left Elikia's side), but
 * withdrawals become `needs_review` instead — refunding one Yabeto may have paid out would pay the
 * merchant twice. Support settles those from the back-office.
 */
class ReconcilePendingPayments extends Command
{
    private const REFRESH_AFTER_MINUTES = 15;

    private const ABANDON_AFTER_HOURS = 24;

    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'payments:reconcile-pending';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Résout les dépôts/retraits et cotisations bloqués en confirmation en interrogeant Yabeto directement.';

    public function handle(
        YabetoService $yabeto,
        ContributionService $contributions,
        VaultTransactionService $vaultTransactions,
        PaymentNotificationService $paymentNotifications,
        TontinePayoutService $payouts,
    ): int {
        if (! $yabeto->isEnabled()) {
            return self::SUCCESS;
        }

        $resolved = 0;
        $flagged = 0;

        Contribution::whereNotIn('status', YabetoStatus::TERMINAL)
            ->whereNotNull('yabeto_reference')
            ->where('created_at', '<=', now()->subMinutes(self::REFRESH_AFTER_MINUTES))
            ->with('group', 'user')
            ->chunkById(50, function ($pending) use (&$resolved, $yabeto, $contributions, $paymentNotifications, $payouts) {
                foreach ($pending as $contribution) {
                    $status = $this->fetchStatus(fn () => $yabeto->getPaymentIntent($contribution->yabeto_reference), $contribution);

                    if ($status === null) {
                        continue;
                    }

                    $resolvedContribution = $contributions->resolveStatus($contribution->id, $status['status']);

                    if (! $resolvedContribution) {
                        continue;
                    }

                    $resolved++;

                    if ($status['succeeded']) {
                        $paymentNotifications->contributionSucceeded($contribution->user, $contribution->group, (float) $contribution->amount);
                        $payouts->disburseIfEligibleAndNotify($contribution->group, $contribution->cycle_period);
                    } elseif ($status['failed']) {
                        $paymentNotifications->contributionFailed($contribution->user, $contribution->group, (float) $contribution->amount, $status['message']);
                    }
                }
            });

        VaultMovement::whereIn('type', ['deposit', 'withdraw'])
            ->where('provider', '!=', VaultTransactionService::CONNECT_PROVIDER)
            ->whereNotIn('status', YabetoStatus::TERMINAL)
            ->whereNotNull('yabeto_reference')
            ->where('created_at', '<=', now()->subMinutes(self::REFRESH_AFTER_MINUTES))
            ->with('vault.company.user')
            ->chunkById(50, function ($pending) use (&$resolved, &$flagged, $yabeto, $vaultTransactions, $paymentNotifications) {
                foreach ($pending as $movement) {
                    $status = $this->fetchStatus(
                        fn () => $movement->type === 'deposit'
                            ? $yabeto->getPaymentIntent($movement->yabeto_reference)
                            : $yabeto->getDisbursement($movement->yabeto_reference),
                        $movement,
                    );

                    if ($status === null) {
                        continue;
                    }

                    // A withdrawal we gave up on goes to support, never to a refund (see
                    // abandonIfOldEnough()).
                    if ($status['status'] === YabetoStatus::NEEDS_REVIEW) {
                        if ($vaultTransactions->flagForReview($movement, $status['message'])) {
                            $flagged++;
                        }

                        continue;
                    }

                    $resolvedMovement = $vaultTransactions->resolveMovementStatus($movement->id, $status['status']);

                    if (! $resolvedMovement) {
                        continue;
                    }

                    $resolved++;
                    $user = $movement->vault->company->user;

                    if ($status['succeeded']) {
                        $movement->type === 'deposit'
                            ? $paymentNotifications->depositSucceeded($user, (float) $movement->amount)
                            : $paymentNotifications->withdrawSucceeded($user, (float) $movement->amount);
                    } elseif ($status['failed']) {
                        $movement->type === 'deposit'
                            ? $paymentNotifications->depositFailed($user, (float) $movement->amount, $status['message'])
                            : $paymentNotifications->withdrawFailed($user, (float) $movement->amount, $status['message']);
                    }
                }
            });

        // A legacy withdrawal whose request died before Yabeto answered has no reference to look
        // up, so nothing above can ever resolve it — and it may or may not have been paid.
        $flagged += $this->flagStuckWithdrawals(
            $vaultTransactions,
            'yabeto',
            fn ($query) => $query->whereNull('yabeto_reference')->where('created_at', '<=', now()->subMinutes(self::REFRESH_AFTER_MINUTES)),
            "La demande de retrait n'a pas reçu de réponse de Yabeto : impossible de savoir si le versement a eu lieu.",
        );

        // Past Yabeto's 24h idempotency window a Connect payout can no longer be replayed safely,
        // so an unresolved one goes to support too.
        $flagged += $this->flagStuckWithdrawals(
            $vaultTransactions,
            VaultTransactionService::CONNECT_PROVIDER,
            fn ($query) => $query->where('created_at', '<=', now()->subHours(self::ABANDON_AFTER_HOURS)),
            "Le retrait Connect n'a pas pu être confirmé auprès de Yabeto dans les {$this->hours()}h.",
        );

        // Connect payouts are synchronous, so one stuck `processing` was interrupted mid-request.
        // Replaying it with its original Idempotency-Key returns the real outcome (Yabeto keeps it
        // for 24h) without risking a second payout.
        VaultMovement::where('type', 'withdraw')
            ->where('provider', VaultTransactionService::CONNECT_PROVIDER)
            ->whereNotIn('status', YabetoStatus::TERMINAL)
            ->where('created_at', '<=', now()->subMinutes(self::REFRESH_AFTER_MINUTES))
            ->where('created_at', '>', now()->subHours(self::ABANDON_AFTER_HOURS))
            ->with('vault.company.user')
            ->chunkById(50, function ($pending) use (&$resolved, $vaultTransactions, $paymentNotifications) {
                foreach ($pending as $movement) {
                    $replayed = $vaultTransactions->replayConnectWithdrawal($movement);

                    if (! $replayed || ! YabetoStatus::isTerminal($replayed->status)) {
                        continue;
                    }

                    $resolved++;
                    $user = $movement->vault->company->user;

                    $replayed->status === 'succeeded'
                        ? $paymentNotifications->withdrawSucceeded($user, (float) $replayed->amount)
                        : $paymentNotifications->withdrawFailed($user, (float) $replayed->amount);
                }
            });

        $this->info("Paiements résolus : {$resolved}. Retraits à vérifier : {$flagged}.");

        return self::SUCCESS;
    }

    /**
     * @param  callable(): (PaymentIntentResult|DisbursementResult)  $fetch
     * @param  Contribution|VaultMovement  $row
     * @return array{status: string, succeeded: bool, failed: bool, message: ?string}|null null
     *                                                                                     means "nothing to do this pass" — still genuinely processing and not old enough to abandon
     */
    private function fetchStatus(callable $fetch, $row): ?array
    {
        try {
            $result = $fetch();
        } catch (YabetoRequestException|ConnectionException) {
            return $this->abandonIfOldEnough($row);
        }

        if (YabetoStatus::isPending($result->status)) {
            return $this->abandonIfOldEnough($row);
        }

        return ['status' => $result->status, 'succeeded' => $result->succeeded(), 'failed' => $result->failed(), 'message' => $result->failureMessage];
    }

    /**
     * Sends unresolvable in-flight withdrawals of one provider to support.
     *
     * @param  \Closure(Builder): mixed  $scope  narrows which rows count as stuck
     */
    private function flagStuckWithdrawals(VaultTransactionService $vaultTransactions, string $provider, \Closure $scope, string $reason): int
    {
        $flagged = 0;

        $query = VaultMovement::where('type', 'withdraw')
            ->where('provider', $provider)
            ->whereNotIn('status', YabetoStatus::NOT_IN_FLIGHT);
        $scope($query);

        $query->chunkById(50, function ($pending) use (&$flagged, $vaultTransactions, $reason) {
            foreach ($pending as $movement) {
                if ($vaultTransactions->flagForReview($movement, $reason)) {
                    $flagged++;
                }
            }
        });

        return $flagged;
    }

    /**
     * @param  Contribution|VaultMovement  $row
     */
    private function abandonIfOldEnough($row): ?array
    {
        // Already with support: keep asking Yabeto for a real outcome, never give up twice.
        if ($row->status === YabetoStatus::NEEDS_REVIEW) {
            return null;
        }

        if ($row->created_at->greaterThan(now()->subHours(self::ABANDON_AFTER_HOURS))) {
            return null;
        }

        // Giving up on a withdrawal must never refund it: Yabeto may well have paid it out, and a
        // refund would let the merchant withdraw the same money again. It goes to support.
        // Deposits and contributions can fail safely — no money left Elikia's side.
        if ($row instanceof VaultMovement && $row->type === 'withdraw') {
            return [
                'status' => YabetoStatus::NEEDS_REVIEW,
                'succeeded' => false,
                'failed' => false,
                'message' => "Yabeto n'a pas pu confirmer ce retrait après {$this->hours()}h : versement à vérifier avant tout remboursement.",
            ];
        }

        return [
            'status' => 'failed',
            'succeeded' => false,
            'failed' => true,
            'message' => "Yabeto n'a pas pu confirmer cette transaction après {$this->hours()}h — abandonnée automatiquement.",
        ];
    }

    private function hours(): int
    {
        return self::ABANDON_AFTER_HOURS;
    }
}
