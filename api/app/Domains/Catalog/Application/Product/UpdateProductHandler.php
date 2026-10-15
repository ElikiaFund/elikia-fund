<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Shared\Domain\Money;

final class UpdateProductHandler
{
    public function __construct(
        private readonly CompanyProducts $companyProducts,
        private readonly ProductRepository $products,
    ) {}

    public function __invoke(UpdateProduct $command): void
    {
        $product = $this->companyProducts->get($command->productId, $command->companyId);
        $changes = $command->changes;

        if (array_key_exists('name', $changes)) {
            $product->rename($changes['name']);
        }

        if (array_key_exists('categoryId', $changes)) {
            $product->moveToCategory($changes['categoryId'] !== null ? ProductCategoryId::fromInt((int) $changes['categoryId']) : null);
        }

        if (array_key_exists('sellPrice', $changes)) {
            $product->changeSellPrice($changes['sellPrice'] !== null ? Money::fromDecimal($changes['sellPrice']) : null);
        }

        if (array_key_exists('costPrice', $changes)) {
            $product->changeCostPrice($changes['costPrice'] !== null ? Money::fromDecimal($changes['costPrice']) : null);
        }

        if (array_key_exists('tracksStock', $changes)) {
            $product->changeStockTracking((bool) $changes['tracksStock']);
        }

        if (array_key_exists('lowStockThreshold', $changes)) {
            $product->changeLowStockThreshold($changes['lowStockThreshold'] !== null ? (int) $changes['lowStockThreshold'] : null);
        }

        $this->products->save($product);
    }
}
