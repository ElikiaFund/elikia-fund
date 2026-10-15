<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Application\Port\CatalogReadModel;

final class ListProductCategoriesHandler
{
    public function __construct(private readonly CatalogReadModel $catalog) {}

    /** @return list<array<string, mixed>> */
    public function __invoke(ListProductCategories $query): array
    {
        return $this->catalog->categories($query->companyId);
    }
}
