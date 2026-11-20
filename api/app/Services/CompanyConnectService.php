<?php

namespace App\Services;

use App\Exceptions\YabetoConnectUnavailableException;
use App\Models\Company;
use App\Models\YabetoConnectAuditLog;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoConnectClient;
use App\Services\Payment\YabetoRequestException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Orchestrates every Yabeto Connect lifecycle step at the Company level — provisioning the
 * connected account, generating onboarding links, and syncing compliance state. Follows the
 * same shape as the other Services here: one DB::transaction() per state-mutating step so
 * the local row and the Yabeto-side resource stay in lockstep (either the account id and
 * timestamps commit together or they don't commit at all), with an audit-trail row written
 * in the same transaction.
 *
 * Deliberately not called from controllers directly — Admin\CompanyConnectController,
 * CompanyController's signup hook, and the yabeto:sync-compliance scheduled command are
 * the three entry points.
 */
class CompanyConnectService
{
    /** Only country documented as covered — see yabeto.md §4 and docs/fr/connect. */
    private const COUNTRY = 'cg';

    private const CURRENCY = 'xaf';

    public function __construct(
        private readonly YabetoConnectClient $client,
        private readonly YabetoConfig $config,
    ) {}

    /**
     * Create the connected account on Yabeto's side and persist its `acct_…` id. Idempotent on
     * both sides: Yabeto's own idempotency key dedupes the HTTP call (safe on retries); a local
     * `yabeto_account_id` already set short-circuits the whole operation (never re-create).
     */
    public function provision(Company $company, string $source = 'signup'): Company
    {
        if ($company->hasConnectAccount()) {
            return $company->fresh();
        }

        $this->assertConnectReady();

        $email = $company->user?->email;
        if (! $email) {
            throw new YabetoConnectUnavailableException("Impossible de provisionner un compte Yabeto Connect : l'entreprise n'a pas d'adresse e-mail propriétaire.");
        }

        // Scoped per company — reusing on retry returns the same account, never duplicates.
        $idempotencyKey = "connect_acct:company:{$company->id}";

        try {
            $result = $this->client->createAccount(
                idempotencyKey: $idempotencyKey,
                country: self::COUNTRY,
                currency: self::CURRENCY,
                name: $company->name,
                email: $email,
            );
        } catch (YabetoRequestException|ConnectionException $e) {
            $this->audit($company, 'provision', 'failure', $source, $e->getMessage());
            throw $e;
        }

        return DB::transaction(function () use ($company, $result, $source) {
            $company->update(['yabeto_account_id' => $result->id]);
            $this->audit($company, 'provision', 'success', $source, null, ['account_id' => $result->id]);

            return $company->fresh();
        });
    }

    /**
     * Fresh hosted-KYC link. Replays return a resumed session (not a new one, per docs), so
     * calling this to "regenerate" a lost link is safe and expected.
     */
    public function issueOnboardingLink(Company $company, string $source = 'mobile'): Company
    {
        $this->assertConnectReady();

        if (! $company->hasConnectAccount()) {
            $company = $this->provision($company, $source);
        }

        try {
            $link = $this->client->createOnboardingLink($company->yabeto_account_id);
        } catch (YabetoRequestException|ConnectionException $e) {
            $this->audit($company, 'onboarding_link', 'failure', $source, $e->getMessage());
            throw $e;
        }

        return DB::transaction(function () use ($company, $link, $source) {
            $company->update([
                'yabeto_onboarding_url' => $link->url,
                'yabeto_onboarding_expires_at' => $link->expiresAt,
            ]);
            $this->audit($company, 'onboarding_link', 'success', $source, null, ['expires_at' => $link->expiresAt]);

            return $company->fresh();
        });
    }

    /**
     * Pulls GET /v1/connect/accounts/{acct}/compliance and mirrors it locally. Only mutates
     * when the state actually changed, so repeated polls are cheap and leave `updated_at`
     * alone on no-ops. Not audited on no-change to keep the log signal-dense.
     */
    public function refreshCompliance(Company $company, string $source = 'schedule'): Company
    {
        $this->assertConnectReady();

        if (! $company->hasConnectAccount()) {
            return $company->fresh();
        }

        try {
            $compliance = $this->client->getCompliance($company->yabeto_account_id);
        } catch (YabetoRequestException|ConnectionException $e) {
            $this->audit($company, 'compliance_refresh', 'failure', $source, $e->getMessage());
            throw $e;
        }

        $previousStatus = $company->yabeto_verification_status;

        $company = DB::transaction(function () use ($company, $compliance) {
            $company->update([
                'yabeto_verification_status' => $compliance->verificationStatus,
                'yabeto_capabilities' => $compliance->toCapabilitiesArray(),
                'yabeto_compliance_checked_at' => now(),
            ]);

            return $company->fresh();
        });

        if ($previousStatus !== $compliance->verificationStatus) {
            $this->audit($company, 'compliance_refresh', 'success', $source, null, [
                'from' => $previousStatus,
                'to' => $compliance->verificationStatus,
                'capabilities' => $compliance->toCapabilitiesArray(),
            ]);
        }

        return $company;
    }

    private function assertConnectReady(): void
    {
        if (! $this->config->isConnectReady()) {
            throw new YabetoConnectUnavailableException(
                'Yabeto Connect n\'est pas prêt : vérifier que le mode `account` est bien activé '
                .'(POST /admin/settings/yabeto/connect-status) et que `connect_enabled` est à vrai.'
            );
        }
    }

    private function audit(Company $company, string $action, string $result, string $source, ?string $reason, array $payload = []): void
    {
        YabetoConnectAuditLog::create([
            'company_id' => $company->id,
            'actor_user_id' => Auth::id(),
            'action' => $action,
            'source' => $source,
            'result' => $result,
            'reason' => $reason,
            'payload' => $payload ?: null,
            'created_at' => now(),
        ]);
    }
}
