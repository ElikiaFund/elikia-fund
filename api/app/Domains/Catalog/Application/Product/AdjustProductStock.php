<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

/** Handled by AdjustProductStockHandler, which returns the new stock movement's id. */
final readonly class AdjustProductStock implements Command
{
    public function __construct(
        public int $productId,
        public int $companyId,
        public int $quantityChange,
        public ?string $note = null,
    ) {}
}
