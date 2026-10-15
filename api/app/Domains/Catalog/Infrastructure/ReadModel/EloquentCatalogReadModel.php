<?php

namespace App\Domains\Catalog\Infrastructure\ReadModel;

use App\Domains\Catalog\Application\Port\CatalogReadModel;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\ProductCategoryRecord;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\ProductRecord;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\StockMovementRecord;

/**
 * Serializes through the Eloquent records on purpose: their casts produce exactly the JSON the
 * endpoints returned before the Catalog context existed ("1500.00" decimals, real booleans).
 */
final class EloquentCatalogReadModel implements CatalogReadModel
{
    public function products(int $companyId): array
    {
        return ProductRecord::where('company_id', $companyId)->with('category')->latest()->get()->toArray();
    }

    public function product(int $productId): ?array
    {
        return ProductRecord::with('category')->find($productId)?->toArray();
    }

    public function stockMovements(int $productId): array
    {
        return StockMovementRecord::where('product_id', $productId)->latest()->get()->toArray();
    }

    public function stockMovement(int $movementId): ?array
    {
        return StockMovementRecord::find($movementId)?->toArray();
    }

    public function categories(int $companyId): array
    {
        return ProductCategoryRecord::where('company_id', $companyId)->orderBy('name')->get()->toArray();
    }

    public function category(int $categoryId): ?array
    {
        return ProductCategoryRecord::find($categoryId)?->toArray();
    }
}
