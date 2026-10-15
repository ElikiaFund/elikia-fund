<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Shared\Domain\CompanyId;

final class RecordProductSaleHandler
{
    public function __construct(private readonly ProductRepository $products) {}

    public function __invoke(RecordProductSale $command): ?RecordedSale
    {
        $product = $this->products->find(ProductId::fromInt($command->productId));

        if (! $product || ! $product->belongsTo(CompanyId::fromInt($command->companyId))) {
            return null;
        }

        $product->recordSale($command->quantity, $command->enforceStockLimit, $command->transactionId);
        $this->products->save($product);

        return new RecordedSale($product->costPrice()?->toDecimalString());
    }
}
