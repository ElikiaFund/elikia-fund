<?php

namespace App\Domains\Catalog\Infrastructure\Persistence\Eloquent;

use Database\Factories\ProductFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Persistence shape of the Product aggregate — the business rules live in
 * App\Domains\Catalog\Domain\Product\Product, never here.
 */
#[Fillable(['company_id', 'name', 'category_id', 'sell_price', 'cost_price', 'tracks_stock', 'stock_quantity', 'low_stock_threshold'])]
class ProductRecord extends Model
{
    /** @use HasFactory<ProductFactory> */
    use HasFactory;

    protected $table = 'products';

    protected function casts(): array
    {
        return [
            'sell_price' => 'decimal:2',
            'cost_price' => 'decimal:2',
            'tracks_stock' => 'boolean',
        ];
    }

    protected static function newFactory(): ProductFactory
    {
        return ProductFactory::new();
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategoryRecord::class, 'category_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovementRecord::class, 'product_id');
    }
}
