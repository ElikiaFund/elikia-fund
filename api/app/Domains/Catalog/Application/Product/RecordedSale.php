<?php

namespace App\Domains\Catalog\Application\Product;

final readonly class RecordedSale
{
    /** @param string|null $unitCost the product's cost at the time of sale, as a decimal string, for margin reporting */
    public function __construct(public ?string $unitCost) {}
}
