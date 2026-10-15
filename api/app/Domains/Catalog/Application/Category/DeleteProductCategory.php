<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Command;

final readonly class DeleteProductCategory implements Command
{
    public function __construct(
        public int $categoryId,
        public int $companyId,
    ) {}
}
