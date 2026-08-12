<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreCompanyRequest;
use App\Models\Company;
use App\Models\ProductCategory;
use App\Models\TransactionCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
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

        return response()->json($company, 201);
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
