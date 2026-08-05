<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\CreditScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditScoreController extends Controller
{
    /**
     * GET /companies/{company}/credit-score — self-service version of Admin\CreditScoreController
     * for the authenticated mobile user to see one of their companies' financial-identity score.
     * Ownership check is independent of the X-Company-Id header/ResolveActiveCompany middleware —
     * it must hold even if the header happens to point at a different company the same user owns.
     */
    public function __invoke(Request $request, Company $company, CreditScoreService $creditScoreService): JsonResponse
    {
        abort_unless($company->user_id === $request->user()->id, 403);

        return response()->json($creditScoreService->calculate($company));
    }
}
