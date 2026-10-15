<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Query;

final readonly class GetProductCategory implements Query
{
    public function __construct(
        public int $categoryId,
        public int $companyId,
    ) {}
}
