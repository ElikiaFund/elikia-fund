<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Services\ProductStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function __construct(private readonly ProductStockService $productStock) {}

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
     *
     * When a product_id is present, ProductStockService::applyProductLink() snapshots the
     * product's cost onto the transaction and, for stock-tracked products, decrements stock —
     * blocking (422) if the sale would oversell, since this is the online path and nothing has
     * physically happened yet.
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        try {
            $transaction = DB::transaction(function () use ($request) {
                $transaction = $request->user()->transactions()->create($request->validated());
                $this->productStock->applyProductLink($transaction, enforceStockLimit: true);

                return $transaction;
            });
        } catch (InsufficientStockException) {
            return response()->json(['message' => 'Stock insuffisant pour ce produit.'], 422);
        }

        return response()->json($transaction, 201);
    }
}
