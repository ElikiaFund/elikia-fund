<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Product\ProductRepository;

final class DeleteProductHandler
{
    public function __construct(
        private readonly CompanyProducts $companyProducts,
        private readonly ProductRepository $products,
    ) {}

    public function __invoke(DeleteProduct $command): void
    {
        $this->products->remove($this->companyProducts->get($command->productId, $command->companyId));
    }
}
