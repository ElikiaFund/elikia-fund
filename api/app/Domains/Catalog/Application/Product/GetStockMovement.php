<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Query;

final readonly class GetStockMovement implements Query
{
    public function __construct(public int $movementId) {}
}
