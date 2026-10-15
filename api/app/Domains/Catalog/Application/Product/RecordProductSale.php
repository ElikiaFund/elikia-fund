<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

/**
 * Bookkeeping's entry point into Catalog: a sale transaction referencing a product. Handled by
 * RecordProductSaleHandler, which returns a RecordedSale, or null when the product doesn't exist
 * (or isn't the company's) — in that case the sale is simply not linked, as before.
 */
final readonly class RecordProductSale implements Command
{
    public function __construct(
        public int $productId,
        public int $companyId,
        public int $quantity,
        public int $transactionId,
        public bool $enforceStockLimit,
    ) {}
}
