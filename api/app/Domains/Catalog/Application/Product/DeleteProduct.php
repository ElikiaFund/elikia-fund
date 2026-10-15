<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Shared\Application\Bus\Command;

final readonly class DeleteProduct implements Command
{
    /** @param int|null $companyId null when back-office staff delete on a merchant's behalf */
    public function __construct(
        public int $productId,
        public ?int $companyId,
    ) {}
}
