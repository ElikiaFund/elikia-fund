<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Application\Port\CatalogReadModel;
use App\Domains\Shared\Application\Exception\AccessDenied;
use App\Domains\Shared\Application\Exception\NotFound;

final class GetProductCategoryHandler
{
    public function __construct(private readonly CatalogReadModel $catalog) {}

    /** @return array<string, mixed> */
    public function __invoke(GetProductCategory $query): array
    {
        $category = $this->catalog->category($query->categoryId) ?? throw NotFound::resource('ProductCategory', $query->categoryId);

        if ((int) $category['company_id'] !== $query->companyId) {
            throw AccessDenied::toResource('ProductCategory', $query->categoryId);
        }

        return $category;
    }
}
