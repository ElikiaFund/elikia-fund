<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Transaction\SyncTransactionsRequest;
use App\Services\ProductStockService;
use Illuminate\Http\JsonResponse;

class SyncController extends Controller
{
    public function __construct(private readonly ProductStockService $productStock) {}

    /**
     * POST /sync — batch upsert for the mobile sync_queue. Upserts by (user_id, uuid) so a
     * retried batch (e.g. the response never reached the device) is idempotent rather than
     * duplicating rows. Conflict rule is deliberately dumb per the sprint plan: last write for a
     * given uuid wins — cash flow entries are personal and mobile has no edit flow, so real
     * conflicts don't happen in practice.
     */
    public function __invoke(SyncTransactionsRequest $request): JsonResponse
    {
        $user = $request->user();
        $accepted = [];

        foreach ($request->validated('transactions') as $entry) {
            $transaction = $user->transactions()->updateOrCreate(
                ['uuid' => $entry['uuid']],
                collect($entry)->except('uuid')->all(),
            );

            // Only the first time this uuid is ever seen — a retried/duplicate batch must not
            // double-decrement stock. Stock is allowed to go negative here (enforceStockLimit:
            // false): an offline sale already physically happened by the time the server sees
            // it, so rejecting it would strand it unsynced with no resolution path from the phone.
            if ($transaction->wasRecentlyCreated) {
                $this->productStock->applyProductLink($transaction, enforceStockLimit: false);
            }

            $accepted[] = $transaction->uuid;
        }

        return response()->json(['accepted' => $accepted]);
    }
}
