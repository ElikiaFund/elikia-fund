<?php

namespace App\Domains\Catalog\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['product_id', 'type', 'quantity_change', 'unit_cost', 'transaction_id', 'note'])]
class StockMovementRecord extends Model
{
    protected $table = 'stock_movements';

    protected function casts(): array
    {
        return [
            'unit_cost' => 'decimal:2',
        ];
    }
}
