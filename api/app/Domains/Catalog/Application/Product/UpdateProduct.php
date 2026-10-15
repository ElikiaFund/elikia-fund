<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

/**
 * Partial update: only the keys present in $changes are applied, so an omitted field keeps its
 * value and an explicit null clears it. Stock quantity is deliberately not editable here — after
 * creation it only changes through restock, adjustment or a sale, each of which is audited.
 */
final readonly class UpdateProduct implements Command
{
    public const FIELDS = ['name', 'categoryId', 'sellPrice', 'costPrice', 'tracksStock', 'lowStockThreshold'];

    /** @param array<string, mixed> $changes keyed by self::FIELDS */
    public function __construct(
        public int $productId,
        public int $companyId,
        public array $changes,
    ) {}
}
