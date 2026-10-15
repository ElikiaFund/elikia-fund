<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

/** Handled by RestockProductHandler, which returns a RestockOutcome. */
final readonly class RestockProduct implements Command
{
    public function __construct(
        public int $productId,
        public int $companyId,
        public int $quantity,
        public string|int|float $unitCost,
        public ?string $note = null,
        public bool $recordExpense = true,
    ) {}
}
