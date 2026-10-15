<?php

namespace App\Domains\Catalog\Infrastructure\Persistence;

use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Catalog\Domain\Product\Product;
use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Catalog\Domain\Product\StockMovementId;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\ProductRecord;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\StockMovementRecord;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;

final class EloquentProductRepository implements ProductRepository
{
    public function find(ProductId $id): ?Product
    {
        $record = ProductRecord::whereKey($id->value)->lockForUpdate()->first();

        if (! $record) {
            return null;
        }

        return Product::reconstitute(
            id: ProductId::fromInt($record->id),
            companyId: CompanyId::fromInt($record->company_id),
            name: $record->name,
            categoryId: $record->category_id ? ProductCategoryId::fromInt($record->category_id) : null,
            sellPrice: $record->sell_price !== null ? Money::fromDecimal($record->sell_price) : null,
            costPrice: $record->cost_price !== null ? Money::fromDecimal($record->cost_price) : null,
            tracksStock: (bool) $record->tracks_stock,
            stockQuantity: (int) $record->stock_quantity,
            lowStockThreshold: $record->low_stock_threshold !== null ? (int) $record->low_stock_threshold : null,
        );
    }

    public function save(Product $product): void
    {
        $record = $product->id() ? ProductRecord::findOrFail($product->id()->value) : new ProductRecord;

        $record->fill([
            'company_id' => $product->companyId()->value,
            'name' => $product->name(),
            'category_id' => $product->categoryId()?->value,
            'sell_price' => $product->sellPrice()?->toDecimalString(),
            'cost_price' => $product->costPrice()?->toDecimalString(),
            'tracks_stock' => $product->tracksStock(),
            'stock_quantity' => $product->stockQuantity(),
            'low_stock_threshold' => $product->lowStockThreshold(),
        ])->save();

        foreach ($product->newMovements() as $movement) {
            $movementRecord = StockMovementRecord::create([
                'product_id' => $record->id,
                'type' => $movement->type->value,
                'quantity_change' => $movement->quantityChange,
                'unit_cost' => $movement->unitCost?->toDecimalString(),
                'transaction_id' => $movement->transactionId(),
                'note' => $movement->note,
            ]);

            $movement->assignId(StockMovementId::fromInt($movementRecord->id));
        }

        $product->markPersisted(ProductId::fromInt($record->id));
    }

    public function remove(Product $product): void
    {
        // stock_movements.product_id cascades on delete.
        ProductRecord::whereKey($product->id()->value)->delete();
    }
}
