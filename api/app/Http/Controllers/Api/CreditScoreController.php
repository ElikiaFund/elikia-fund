<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CreditScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CreditScoreController extends Controller
{
    /**
     * GET /me/credit-score — self-service version of Admin\CreditScoreController for the
     * authenticated mobile user to see their own financial-identity score.
     */
    public function __invoke(Request $request, CreditScoreService $creditScoreService): JsonResponse
    {
        return response()->json($creditScoreService->calculate($request->user()));
    }
}
