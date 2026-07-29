<?php

namespace App\Services;

use App\Exceptions\InsufficientStockException;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Owns every stock/cost side-effect a product can go through — mirrors VaultController's exact
 * running-balance + audit-trail-movement shape (increment/decrement inside a DB::transaction()
 * alongside creating the movement row), the only other "balance + movements" precedent in this
 * codebase.
 */
class ProductStockService
{
    /**
     * Writes a baseline "adjustment" movement for a product created with a non-zero starting
     * stock_quantity, so "sum of all movements == current stock_quantity" is always true, even
     * for the very first value.
     */
    public function recordInitialStock(Product $product): StockMovement
    {
        return $product->stockMovements()->create([
            'user_id' => $product->user_id,
            'type' => 'adjustment',
            'quantity_change' => $product->stock_quantity,
            'unit_cost' => $product->cost_price,
            'note' => 'Stock initial',
        ]);
    }

    /**
     * Adds stock and recomputes the product's running weighted-average cost:
     * new_cost = (old_qty*old_cost + quantity*unitCost) / (old_qty+quantity).
     *
     * Deliberately a single running valuation per product, not per-batch cost lots (no FIFO) —
     * a micro-business owner has no practical way to track purchase batches by hand, and one
     * averaged cost is enough to support margin/inventory-value reporting without that overhead.
     */
    public function restock(Product $product, int $quantity, float $unitCost, ?string $note, bool $createExpense): array
    {
        return DB::transaction(function () use ($product, $quantity, $unitCost, $note, $createExpense) {
            $oldQuantity = $product->stock_quantity;
            $oldCost = (float) ($product->cost_price ?? 0);
            $newQuantity = $oldQuantity + $quantity;
            $newCost = $newQuantity > 0
                ? (($oldQuantity * $oldCost) + ($quantity * $unitCost)) / $newQuantity
                : $unitCost;

            $product->increment('stock_quantity', $quantity);
            $product->update(['cost_price' => round($newCost, 2)]);

            $movement = $product->stockMovements()->create([
                'user_id' => $product->user_id,
                'type' => 'restock',
                'quantity_change' => $quantity,
                'unit_cost' => $unitCost,
                'note' => $note,
            ]);

            $transaction = null;

            if ($createExpense) {
                $transaction = $product->user->transactions()->create([
                    'uuid' => (string) Str::uuid(),
                    'type' => 'expense',
                    'amount' => round($quantity * $unitCost, 2),
                    'category' => 'achat_stock',
                    'note' => $note,
                    'product_name' => $product->name,
                    'quantity' => $quantity,
                    'product_id' => $product->id,
                    'unit_cost' => $unitCost,
                    'occurred_at' => now(),
                ]);

                $movement->update(['transaction_id' => $transaction->id]);
            }

            return ['product' => $product->fresh(), 'movement' => $movement->fresh(), 'transaction' => $transaction];
        });
    }

    /**
     * A manual correction (loss, breakage, recount) — always blocking if it would take stock
     * below zero, unlike an offline sale (see applyProductLink()): an adjustment is a deliberate
     * correction happening in the moment, not something that already happened elsewhere.
     */
    public function adjust(Product $product, int $quantityChange, ?string $note): StockMovement
    {
        if ($quantityChange < 0 && abs($quantityChange) > $product->stock_quantity) {
            throw new InsufficientStockException;
        }

        return DB::transaction(function () use ($product, $quantityChange, $note) {
            $product->increment('stock_quantity', $quantityChange);

            return $product->stockMovements()->create([
                'user_id' => $product->user_id,
                'type' => 'adjustment',
                'quantity_change' => $quantityChange,
                'unit_cost' => $product->cost_price,
                'note' => $note,
            ]);
        });
    }

    /**
     * The one shared place stock/margin side-effects happen for an income transaction that
     * references a catalog product — called by both TransactionController@store (online,
     * enforceStockLimit: true) and SyncController (offline batch sync, enforceStockLimit: false,
     * since an offline sale already physically happened and can't be rejected after the fact).
     *
     * unit_cost is snapshotted onto the transaction uniformly, whether or not the product tracks
     * stock, so margin reporting works for services too.
     */
    public function applyProductLink(Transaction $transaction, bool $enforceStockLimit): void
    {
        if (! $transaction->product_id || $transaction->type !== 'income') {
            return;
        }

        $product = Product::where('id', $transaction->product_id)->where('user_id', $transaction->user_id)->first();

        if (! $product) {
            return;
        }

        DB::transaction(function () use ($product, $transaction, $enforceStockLimit) {
            if ($product->tracks_stock) {
                $quantity = $transaction->quantity ?? 1;

                if ($enforceStockLimit && $quantity > $product->stock_quantity) {
                    throw new InsufficientStockException;
                }

                $product->decrement('stock_quantity', $quantity);

                $product->stockMovements()->create([
                    'user_id' => $transaction->user_id,
                    'type' => 'sale',
                    'quantity_change' => -$quantity,
                    'unit_cost' => $product->cost_price,
                    'transaction_id' => $transaction->id,
                ]);
            }

            $transaction->update(['unit_cost' => $product->cost_price]);
        });
    }
}
