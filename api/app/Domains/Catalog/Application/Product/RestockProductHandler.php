<?php

namespace App\Domains\Catalog\Application\Product;

use App\Domains\Catalog\Application\Port\ExpenseRecorder;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Shared\Domain\Money;

final class RestockProductHandler
{
    public function __construct(
        private readonly CompanyProducts $companyProducts,
        private readonly ProductRepository $products,
        private readonly ExpenseRecorder $expenses,
    ) {}

    public function __invoke(RestockProduct $command): RestockOutcome
    {
        $product = $this->companyProducts->get($command->productId, $command->companyId);
        $unitCost = Money::fromDecimal($command->unitCost);

        $movement = $product->restock($command->quantity, $unitCost, $command->note);

        $expenseId = null;

        if ($command->recordExpense) {
            $expenseId = $this->expenses->recordStockPurchase(
                $product->companyId(),
                $product->id(),
                $product->name(),
                $command->quantity,
                $unitCost,
                $command->note,
            );

            $movement->linkToTransaction($expenseId);
        }

        $this->products->save($product);

        return new RestockOutcome($movement->id()->value, $expenseId);
    }
}
