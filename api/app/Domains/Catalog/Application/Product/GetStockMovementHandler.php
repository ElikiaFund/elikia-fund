<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Application\Port\CatalogReadModel;
use App\Domains\Shared\Application\Exception\NotFound;

final class GetStockMovementHandler
{
    public function __construct(private readonly CatalogReadModel $catalog) {}

    /** @return array<string, mixed> */
    public function __invoke(GetStockMovement $query): array
    {
        return $this->catalog->stockMovement($query->movementId) ?? throw NotFound::resource('StockMovement', $query->movementId);
    }
}
