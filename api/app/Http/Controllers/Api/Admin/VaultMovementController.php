<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\VaultMovement;
use Illuminate\Http\JsonResponse;

class VaultMovementController extends Controller
{
    /**
     * GET /admin/vault-movements — every deposit/withdrawal/payout platform-wide, fee columns
     * included, for the back-office Finance page's revenue aggregation. Unlike the security-event
     * or credit-score endpoints this isn't scoped to one user — Finance needs the whole ledger.
     */
    public function index(): JsonResponse
    {
        return response()->json(VaultMovement::with('vault.company.user')->latest()->get());
    }
}
