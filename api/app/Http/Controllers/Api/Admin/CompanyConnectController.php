<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\YabetoConnectUnavailableException;
use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\YabetoConnectAuditLog;
use App\Services\CompanyConnectService;
use App\Services\Payment\YabetoRequestException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Back-office entry points for the per-company Yabeto Connect lifecycle (provision, onboarding
 * link, compliance refresh, audit log view). Mirrors Admin\YabetoSettingController's style:
 * CompanyConnectService does the actual work; this layer just maps service outcomes to stable
 * JSON for the dashboard and localizes failures to French.
 *
 * Permission: `yabeto_connect.manage` (seeded by PermissionSeeder). Audit log read is open to
 * any authenticated admin with company view access, matching how other audit-style reads work.
 */
class CompanyConnectController extends Controller
{
    public function __construct(private readonly CompanyConnectService $connect) {}

    public function show(Company $company): JsonResponse
    {
        return response()->json($this->present($company));
    }

    public function provision(Company $company): JsonResponse
    {
        return $this->run(fn () => $this->connect->provision($company, 'admin'));
    }

    public function issueOnboardingLink(Company $company): JsonResponse
    {
        return $this->run(fn () => $this->connect->issueOnboardingLink($company, 'admin'));
    }

    public function refreshCompliance(Company $company): JsonResponse
    {
        return $this->run(fn () => $this->connect->refreshCompliance($company, 'admin'));
    }

    public function auditLog(Company $company): JsonResponse
    {
        return response()->json(
            YabetoConnectAuditLog::where('company_id', $company->id)
                ->with('actor:id,name,email')
                ->latest('created_at')
                ->limit(100)
                ->get()
        );
    }

    private function run(\Closure $op): JsonResponse
    {
        try {
            $company = $op();
        } catch (YabetoRequestException $e) {
            Log::warning('Yabeto Connect company operation failed', ['message' => $e->getMessage()]);

            return response()->json(['message' => $e->userMessage()], 422);
        } catch (ConnectionException $e) {
            Log::warning('Yabeto Connect company operation unreachable', ['message' => $e->getMessage()]);

            return response()->json(['message' => "Le serveur n'a pas pu joindre Yabeto Pay."], 503);
        } catch (YabetoConnectUnavailableException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($this->present($company));
    }

    private function present(Company $company): array
    {
        return [
            'id' => $company->id,
            'name' => $company->name,
            'yabeto_account_id' => $company->yabeto_account_id,
            'yabeto_onboarding_url' => $company->yabeto_onboarding_url,
            'yabeto_onboarding_expires_at' => $company->yabeto_onboarding_expires_at,
            'yabeto_verification_status' => $company->yabeto_verification_status,
            'yabeto_capabilities' => $company->yabeto_capabilities,
            'yabeto_compliance_checked_at' => $company->yabeto_compliance_checked_at,
            'is_connect_ready' => $company->isConnectReady(),
        ];
    }
}
