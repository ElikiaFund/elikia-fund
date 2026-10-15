<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Application\Port\CatalogReadModel;

final class ListStockMovementsHandler
{
    public function __construct(
        private readonly CatalogReadModel $catalog,
        private readonly GetProductHandler $products,
    ) {}

    /** @return list<array<string, mixed>> */
    public function __invoke(ListStockMovements $query): array
    {
        ($this->products)(new GetProduct($query->productId, $query->companyId));

        return $this->catalog->stockMovements($query->productId);
    }
}
