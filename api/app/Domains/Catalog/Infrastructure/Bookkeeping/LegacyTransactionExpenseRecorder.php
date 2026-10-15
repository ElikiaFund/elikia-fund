<?php

namespace App\Domains\Catalog\Infrastructure\Bookkeeping;

use App\Domains\Catalog\Application\Port\ExpenseRecorder;
use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;
use App\Models\Transaction;
use Illuminate\Support\Str;

/**
 * Temporary adapter onto the legacy transactions model. When Bookkeeping becomes a bounded
 * context, this calls its "record expense" command instead and the App\Models import goes away.
 */
final class LegacyTransactionExpenseRecorder implements ExpenseRecorder
{
    public function recordStockPurchase(
        CompanyId $companyId,
        ProductId $productId,
        string $productName,
        int $quantity,
        Money $unitCost,
        ?string $note,
    ): int {
        return Transaction::create([
            'uuid' => (string) Str::uuid(),
            'company_id' => $companyId->value,
            'type' => 'expense',
            'amount' => $unitCost->multiply($quantity)->toDecimalString(),
            'category' => 'achat_stock',
            'note' => $note,
            'product_name' => $productName,
            'quantity' => $quantity,
            'product_id' => $productId->value,
            'unit_cost' => $unitCost->toDecimalString(),
            'occurred_at' => now(),
        ])->id;
    }
}
