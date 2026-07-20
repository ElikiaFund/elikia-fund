<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    /**
     * GET /transactions — the authenticated user's cash flow entries. Mobile reads from its
     * local SQLite copy day-to-day (offline-first); this endpoint exists for reinstall/multi-device
     * recovery and is what the sync engine reconciles against.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->transactions()->latest('occurred_at')->get());
    }

    /**
     * POST /transactions — create a single transaction directly (online path; the mobile app's
     * everyday cash flow writes go through local SQLite + the batch SyncController instead).
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = $request->user()->transactions()->create($request->validated());

        return response()->json($transaction, 201);
    }
}
