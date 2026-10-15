<?php

namespace App\Domains\Catalog\Domain\Product;

enum StockMovementType: string
{
    case Restock = 'restock';
    case Sale = 'sale';
    case Adjustment = 'adjustment';
}
