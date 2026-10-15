<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Query;

final readonly class ListProductCategories implements Query
{
    public function __construct(public int $companyId) {}
}
