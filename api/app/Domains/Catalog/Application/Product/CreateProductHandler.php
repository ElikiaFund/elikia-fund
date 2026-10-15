<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Catalog\Domain\Product\Product;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;

final class CreateProductHandler
{
    public function __construct(private readonly ProductRepository $products) {}

    public function __invoke(CreateProduct $command): int
    {
        $product = Product::create(
            companyId: CompanyId::fromInt($command->companyId),
            name: $command->name,
            categoryId: $command->categoryId !== null ? ProductCategoryId::fromInt($command->categoryId) : null,
            sellPrice: $command->sellPrice !== null ? Money::fromDecimal($command->sellPrice) : null,
            costPrice: $command->costPrice !== null ? Money::fromDecimal($command->costPrice) : null,
            tracksStock: $command->tracksStock,
            stockQuantity: $command->stockQuantity,
            lowStockThreshold: $command->lowStockThreshold,
        );

        $this->products->save($product);

        return $product->id()->value;
    }
}
