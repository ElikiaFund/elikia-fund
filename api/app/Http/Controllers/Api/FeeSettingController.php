<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FeeService;
use Illuminate\Http\JsonResponse;

/** GET /settings/fees — current fee rates, for the mobile fee-preview UI (create-group, group detail, vault-transaction). */
class FeeSettingController extends Controller
{
    public function show(FeeService $fees): JsonResponse
    {
        return response()->json($fees->currentRates());
    }
}
