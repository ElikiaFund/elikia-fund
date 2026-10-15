<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\StoreTransactionRequest;
use App\Services\TransactionProductLinker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function __construct(private readonly TransactionProductLinker $products) {}

    /**
     * GET /transactions — the active company's cash flow entries. Mobile reads from its
     * local SQLite copy day-to-day (offline-first); this endpoint exists for reinstall/multi-device
     * recovery and is what the sync engine reconciles against.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->company()->transactions()->latest('occurred_at')->get());
    }

    /**
     * POST /transactions — create a single transaction directly (online path; the mobile app's
     * everyday cash flow writes go through local SQLite + the batch SyncController instead).
     *
     * A sale of a stock-tracked product is refused (422 « Stock insuffisant pour ce produit. »,
     * rendered from the Catalog's InsufficientStock) if it would oversell, since this is the online
     * path and nothing has physically happened yet — and the transaction itself is rolled back.
     */
    public function store(StoreTransactionRequest $request): JsonResponse
    {
        $transaction = DB::transaction(function () use ($request) {
            $transaction = $request->company()->transactions()->create($request->validated());
            $this->products->link($transaction, enforceStockLimit: true);

            return $transaction;
        });

        return response()->json($transaction, 201);
    }
}
