<?php

namespace App\Domains\Catalog\Application\Port;

use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;

/**
 * Lets a restock show up in the merchant's cash flow as an "achat_stock" expense. Bookkeeping
 * owns transactions, so Catalog only states what it needs and an adapter does the rest.
 */
interface ExpenseRecorder
{
    /** @return int the id of the expense transaction that was recorded */
    public function recordStockPurchase(
        CompanyId $companyId,
        ProductId $productId,
        string $productName,
        int $quantity,
        Money $unitCost,
        ?string $note,
    ): int;
}
