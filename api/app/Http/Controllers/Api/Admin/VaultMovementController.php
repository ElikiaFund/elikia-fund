<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\VaultTransactionException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SettleVaultMovementRequest;
use App\Models\VaultMovement;
use App\Services\PaymentNotificationService;
use App\Services\VaultTransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class VaultMovementController extends Controller
{
    public function __construct(
        private readonly VaultTransactionService $vaultTransactions,
        private readonly PaymentNotificationService $paymentNotifications,
    ) {}

    /**
     * GET /admin/vault-movements — every deposit/withdrawal/payout platform-wide, fee columns
     * included, for the back-office Finance page's revenue aggregation. Unlike the security-event
     * or credit-score endpoints this isn't scoped to one user — Finance needs the whole ledger.
     */
    public function index(): JsonResponse
    {
        return response()->json(VaultMovement::with(['vault.company.user', 'reviewer:id,name'])->latest()->get());
    }

    /**
     * POST /admin/vault-movements/{movement}/settle — support's verdict on a `needs_review`
     * withdrawal, after checking Yabeto's dashboard: `succeeded` (the payout went through, the
     * reserved money stays out) or `failed` (it didn't, refund the vault). Moves real money, so
     * on top of `vault_movements.settle` it re-checks the admin's password server-side.
     */
    public function settle(SettleVaultMovementRequest $request, VaultMovement $movement): JsonResponse
    {
        if (! Hash::check($request->validated('password'), $request->user()->password)) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 422);
        }

        $outcome = $request->validated('outcome');

        try {
            $settled = $this->vaultTransactions->settleReview($movement, $outcome, $request->user()->id, $request->validated('note'));
        } catch (VaultTransactionException $e) {
            return response()->json(['message' => $e->getMessage()], 409);
        }

        $merchant = $settled->vault?->company?->user;

        if ($merchant) {
            $outcome === 'succeeded'
                ? $this->paymentNotifications->withdrawSucceeded($merchant, (float) $settled->amount)
                : $this->paymentNotifications->withdrawFailed($merchant, (float) $settled->amount);
        }

        return response()->json($settled->load(['vault.company.user', 'reviewer:id,name']));
    }
}
