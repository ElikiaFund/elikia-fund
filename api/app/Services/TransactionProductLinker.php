<?php

namespace App\Services;

use App\Domains\Catalog\Application\Product\RecordProductSale;
use App\Domains\Shared\Application\Bus\CommandBus;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

/**
 * Bookkeeping's side of selling a catalog product: hands the sale to the Catalog context (stock
 * and its movement) and snapshots the product's cost onto the transaction for margin reporting.
 * Used by the online path (TransactionController, stock limit enforced) and offline sync
 * (SyncController, never enforced — the sale already happened). Moves into the Bookkeeping
 * context when that one is migrated.
 */
class TransactionProductLinker
{
    public function __construct(private readonly CommandBus $commands) {}

    public function link(Transaction $transaction, bool $enforceStockLimit): void
    {
        if (! $transaction->product_id || $transaction->type !== 'income') {
            return;
        }

        DB::transaction(function () use ($transaction, $enforceStockLimit) {
            $sale = $this->commands->dispatch(new RecordProductSale(
                productId: $transaction->product_id,
                companyId: $transaction->company_id,
                quantity: $transaction->quantity ?? 1,
                transactionId: $transaction->id,
                enforceStockLimit: $enforceStockLimit,
            ));

            if ($sale !== null) {
                $transaction->update(['unit_cost' => $sale->unitCost]);
            }
        });
    }
}
