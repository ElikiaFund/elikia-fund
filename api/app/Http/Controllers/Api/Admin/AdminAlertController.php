<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAlert;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The back-office bell. Any admin can see and acknowledge alerts — acknowledging only means
 * "someone is on it", it never changes money. Settling a flagged withdrawal is a separate,
 * permission-gated action (VaultMovementController::settle).
 */
class AdminAlertController extends Controller
{
    /** GET /admin/alerts — unacknowledged first, then the most recent; capped at 100. */
    public function index(): JsonResponse
    {
        return response()->json(
            AdminAlert::with('acknowledgedBy:id,name')
                ->orderByRaw('acknowledged_at IS NOT NULL')
                ->latest()
                ->limit(100)
                ->get()
        );
    }

    public function acknowledge(Request $request, AdminAlert $alert): JsonResponse
    {
        if (! $alert->acknowledged_at) {
            $alert->update(['acknowledged_at' => now(), 'acknowledged_by_user_id' => $request->user()->id]);
        }

        return response()->json($alert->fresh('acknowledgedBy:id,name'));
    }

    public function acknowledgeAll(Request $request): JsonResponse
    {
        $count = AdminAlert::whereNull('acknowledged_at')
            ->update(['acknowledged_at' => now(), 'acknowledged_by_user_id' => $request->user()->id]);

        return response()->json(['acknowledged' => $count]);
    }
}
