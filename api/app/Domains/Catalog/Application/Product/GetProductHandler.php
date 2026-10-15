<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Application\Port\CatalogReadModel;
use App\Domains\Shared\Application\Exception\AccessDenied;
use App\Domains\Shared\Application\Exception\NotFound;

final class GetProductHandler
{
    public function __construct(private readonly CatalogReadModel $catalog) {}

    /** @return array<string, mixed> */
    public function __invoke(GetProduct $query): array
    {
        $product = $this->catalog->product($query->productId) ?? throw NotFound::resource('Product', $query->productId);

        if ((int) $product['company_id'] !== $query->companyId) {
            throw AccessDenied::toResource('Product', $query->productId);
        }

        return $product;
    }
}
