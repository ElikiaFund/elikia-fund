<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\YabetoConnectUnavailableException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreCompanyRequest;
use App\Models\Company;
use App\Models\ProductCategory;
use App\Models\TransactionCategory;
use App\Services\CompanyConnectService;
use App\Services\Payment\YabetoConfig;
use App\Services\Payment\YabetoRequestException;
use App\Services\YabetoConnectGate;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CompanyController extends Controller
{
    public function __construct(
        private readonly CompanyConnectService $connect,
        private readonly YabetoConfig $yabetoConfig,
        private readonly YabetoConnectGate $connectGate,
    ) {}

    /**
     * GET /companies — every company the authenticated user owns, for the mobile switcher.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->companies()->latest()->get());
    }

    /**
     * POST /companies — creates a company for the authenticated user. Used both for first-time
     * onboarding and for adding a 2nd+ company later via the switcher — the only difference is
     * onboarding_completed_at only gets set the first time.
     */
    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $user = $request->user();

        $company = $user->companies()->create($request->validated());

        ProductCategory::seedDefaultsFor($company);
        TransactionCategory::seedDefaultsFor($company);

        if (! $user->onboarding_completed_at) {
            $user->forceFill(['onboarding_completed_at' => now()])->save();
        }

        // Every company created while Connect is live is a Connect company: marked first, so a
        // failed provisioning below still keeps it out of the legacy (Elikia-custody) flow — its
        // money stays locked until KYC is approved (see YabetoConnectGate). Provisioning failures
        // don't abort signup; the merchant's "Vérifier mon identité" tap provisions on demand.
        if ($this->yabetoConfig->isConnectReady()) {
            $company->update(['yabeto_connect_required' => true]);

            try {
                $company = $this->connect->provision($company, 'signup');
            } catch (YabetoRequestException|ConnectionException|YabetoConnectUnavailableException $e) {
                Log::warning('Deferred Yabeto Connect provisioning for company', [
                    'company_id' => $company->id,
                    'reason' => $e->getMessage(),
                ]);
            }
        }

        return response()->json($company, 201);
    }

    /**
     * POST /companies/{company}/yabeto-connect/onboarding-link — the mobile app calls this when
     * the merchant taps "Vérifier mon identité" on their KYC pending screen. Owner-authorized
     * (not admin-only, unlike Admin\CompanyConnectController), because KYC is initiated by the
     * merchant themselves. Returns the hosted URL for expo-web-browser to open.
     */
    public function requestOnboardingLink(Request $request, Company $company): JsonResponse
    {
        abort_unless($company->user_id === $request->user()->id, 403);

        try {
            $company = $this->connect->issueOnboardingLink($company, 'mobile');
        } catch (YabetoRequestException $e) {
            return response()->json(['message' => $e->userMessage()], 422);
        } catch (ConnectionException) {
            return response()->json(['message' => 'Impossible de joindre Yabeto pour générer le lien. Réessayez dans un instant.'], 503);
        } catch (YabetoConnectUnavailableException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'onboarding_url' => $company->yabeto_onboarding_url,
            'expires_at' => $company->yabeto_onboarding_expires_at,
        ]);
    }

    /**
     * GET /companies/{company}/yabeto-connect — merchant-facing status read. Used by the mobile
     * pending/approved/rejected UI to decide which empty-state to show. Also polled on screen
     * focus so the merchant sees unlock the moment Yabeto approves (without waiting for the
     * next 15-minute compliance sweep).
     *
     * The merchant *can* trigger a live refresh here — otherwise they'd be blocked by the
     * schedule-only polling cadence and have no way to accelerate their own unlock. Rate-limiting
     * lives at the Laravel route level (throttle middleware), not here.
     */
    public function showConnectStatus(Request $request, Company $company): JsonResponse
    {
        abort_unless($company->user_id === $request->user()->id, 403);

        if ($company->hasConnectAccount() && $this->yabetoConfig->isConnectReady()) {
            try {
                $company = $this->connect->refreshCompliance($company, 'mobile');
            } catch (YabetoRequestException|ConnectionException) {
                // Fall through to the stale cached state — better than erroring out the status
                // read altogether (the UI handles cached state gracefully).
            }
        }

        return response()->json([
            'requires_verification' => $this->connectGate->requiresVerification($company),
            'has_account' => $company->hasConnectAccount(),
            'verification_status' => $company->yabeto_verification_status,
            'is_connect_ready' => $company->isConnectReady(),
            'onboarding_url' => $company->yabeto_onboarding_url,
            'onboarding_expires_at' => $company->yabeto_onboarding_expires_at,
            'compliance_checked_at' => $company->yabeto_compliance_checked_at,
        ]);
    }

    /**
     * DELETE /companies/{company} — mobile-facing self-service deletion, gated by the company
     * switcher's confirmation screen. Cascades to transactions/products/product & transaction
     * categories/cash sessions/vault (all cascadeOnDelete FKs) — blocked outright while the
     * vault still holds a positive balance, since cascading would otherwise silently destroy
     * real money rather than require it be withdrawn first.
     */
    public function destroy(Request $request, Company $company): JsonResponse
    {
        abort_unless($company->user_id === $request->user()->id, 403);
        abort_if((float) ($company->vault?->balance ?? 0) > 0, 409, 'Impossible de supprimer une entreprise dont le coffre a un solde positif.');

        $company->delete();

        return response()->json(['message' => 'Entreprise supprimée.']);
    }
}
