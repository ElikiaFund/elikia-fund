<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\CreditScoreService;
use Illuminate\Http\JsonResponse;

class CreditScoreController extends Controller
{
    /**
     * GET /admin/companies/{company}/credit-score
     */
    public function __invoke(Company $company, CreditScoreService $creditScoreService): JsonResponse
    {
        return response()->json($creditScoreService->calculate($company));
    }
}
