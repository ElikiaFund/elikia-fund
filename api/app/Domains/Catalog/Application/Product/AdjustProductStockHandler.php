<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Product\ProductRepository;

final class AdjustProductStockHandler
{
    public function __construct(
        private readonly CompanyProducts $companyProducts,
        private readonly ProductRepository $products,
    ) {}

    public function __invoke(AdjustProductStock $command): int
    {
        $product = $this->companyProducts->get($command->productId, $command->companyId);
        $movement = $product->adjustStock($command->quantityChange, $command->note);

        $this->products->save($product);

        return $movement->id()->value;
    }
}
