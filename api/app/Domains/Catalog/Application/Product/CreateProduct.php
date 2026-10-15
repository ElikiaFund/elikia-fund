<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

/** Handled by CreateProductHandler, which returns the new product's id. */
final readonly class CreateProduct implements Command
{
    public function __construct(
        public int $companyId,
        public string $name,
        public ?int $categoryId = null,
        public string|int|float|null $sellPrice = null,
        public string|int|float|null $costPrice = null,
        public bool $tracksStock = false,
        public int $stockQuantity = 0,
        public ?int $lowStockThreshold = null,
    ) {}
}
