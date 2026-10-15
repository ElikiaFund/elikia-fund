<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Application\Port\CatalogReadModel;

final class ListProductsHandler
{
    public function __construct(private readonly CatalogReadModel $catalog) {}

    /** @return list<array<string, mixed>> */
    public function __invoke(ListProducts $query): array
    {
        return $this->catalog->products($query->companyId);
    }
}
