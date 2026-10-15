<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Product\Product;
use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Shared\Application\Exception\AccessDenied;
use App\Domains\Shared\Application\Exception\NotFound;
use App\Domains\Shared\Domain\CompanyId;

/** Loads a product for a write use case and enforces that it belongs to the acting company. */
final class CompanyProducts
{
    public function __construct(private readonly ProductRepository $products) {}

    /** @param int|null $companyId null when back-office staff act across companies */
    public function get(int $productId, ?int $companyId): Product
    {
        $product = $this->products->find(ProductId::fromInt($productId))
            ?? throw NotFound::resource('Product', $productId);

        if ($companyId !== null && ! $product->belongsTo(CompanyId::fromInt($companyId))) {
            throw AccessDenied::toResource('Product', $productId);
        }

        return $product;
    }
}
