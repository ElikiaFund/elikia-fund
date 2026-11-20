<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Services\CompanyConnectService;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoRequestException;
use Illuminate\Console\Command;
use Illuminate\Http\Client\ConnectionException;

/**
 * Polls Yabeto's compliance endpoint for every connected company that isn't in a terminal
 * verification state yet. Required because Connect emits NO webhook on verification status
 * changes (docs/fr/connect/accounts/onboarding "Aucun webhook n'est émis au changement d'état
 * du dossier"). Scheduled every 15 min in routes/console.php.
 *
 * Terminal states (approved, rejected) are skipped — a rejected company requires a manual
 * back-office action to re-open onboarding anyway, so re-polling it buys nothing. Approved
 * companies would only change if Yabeto revokes capabilities post-hoc; those get surfaced via
 * webhooks on the money flows that would then fail, not via this sweep.
 */
class SyncYabetoCompliance extends Command
{
    protected $signature = 'yabeto:sync-compliance {--limit=100}';

    protected $description = 'Poll Yabeto Connect compliance for every company awaiting KYC resolution.';

    // Dependencies are injected into handle(), not the constructor: Artisan instantiates every
    // command on boot, and YabetoConfig reads `yabeto_settings` — constructor injection would
    // hit the database on every artisan call, including `migrate` on a fresh install.
    public function handle(CompanyConnectService $connect, YabetoConfig $config): int
    {
        if (! $config->isConnectReady()) {
            $this->info('Yabeto Connect n\'est pas prêt — synchronisation ignorée.');

            return self::SUCCESS;
        }

        $limit = (int) $this->option('limit');

        $companies = Company::whereNotNull('yabeto_account_id')
            ->where(function ($query) {
                $query->whereNull('yabeto_verification_status')
                    ->orWhereNotIn('yabeto_verification_status', Company::YABETO_VERIFICATION_TERMINAL);
            })
            ->orderByRaw('yabeto_compliance_checked_at IS NULL DESC, yabeto_compliance_checked_at ASC')
            ->limit($limit)
            ->get();

        $this->info("Synchronisation de {$companies->count()} entreprise(s).");

        $errors = 0;
        foreach ($companies as $company) {
            try {
                $connect->refreshCompliance($company, 'schedule');
            } catch (YabetoRequestException|ConnectionException $e) {
                $errors++;
                $this->warn("Entreprise {$company->id} ({$company->yabeto_account_id}): {$e->getMessage()}");
            }
        }

        if ($errors > 0) {
            $this->warn("{$errors} échec(s) de synchronisation — voir le log yabeto_connect_audit_log.");
        }

        return self::SUCCESS;
    }
}
