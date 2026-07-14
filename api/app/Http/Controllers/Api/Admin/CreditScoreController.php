<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\CreditScoreService;
use Illuminate\Http\JsonResponse;

class CreditScoreController extends Controller
{
    /**
     * GET /admin/users/{user}/credit-score
     */
    public function __invoke(User $user, CreditScoreService $creditScoreService): JsonResponse
    {
        return response()->json($creditScoreService->calculate($user));
    }
}
