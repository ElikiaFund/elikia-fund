<?php

namespace App\Console\Commands;

use App\Models\Contribution;
use App\Models\VaultMovement;
use App\Services\ContributionService;
use App\Services\Payment\DTOs\DisbursementResult;
use App\Services\Payment\DTOs\PaymentIntentResult;
use App\Services\Payment\YabetoRequestException;
use App\Services\Payment\YabetoService;
use App\Services\PaymentNotificationService;
use App\Services\TontinePayoutService;
use App\Services\VaultTransactionService;
use Illuminate\Console\Command;
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
 * window (ABANDON_AFTER_HOURS), treat it as abandoned (mark failed, which refunds a reserved
 * withdrawal) rather than leave the user blocked indefinitely.
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

        Contribution::where('status', 'processing')
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
            ->where('status', 'processing')
            ->whereNotNull('yabeto_reference')
            ->where('created_at', '<=', now()->subMinutes(self::REFRESH_AFTER_MINUTES))
            ->with('vault.company.user')
            ->chunkById(50, function ($pending) use (&$resolved, $yabeto, $vaultTransactions, $paymentNotifications) {
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

        $this->info("Paiements résolus : {$resolved}.");

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

        if ($result->status === 'processing') {
            return $this->abandonIfOldEnough($row);
        }

        return ['status' => $result->status, 'succeeded' => $result->succeeded(), 'failed' => $result->failed(), 'message' => $result->failureMessage];
    }

    /**
     * @param  Contribution|VaultMovement  $row
     */
    private function abandonIfOldEnough($row): ?array
    {
        if ($row->created_at->greaterThan(now()->subHours(self::ABANDON_AFTER_HOURS))) {
            return null;
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
