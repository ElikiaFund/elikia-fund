<?php

namespace Tests\Unit\Catalog;

use App\Domains\Catalog\Domain\Product\InsufficientStock;
use App\Domains\Catalog\Domain\Product\InvalidStockQuantity;
use App\Domains\Catalog\Domain\Product\Product;
use App\Domains\Catalog\Domain\Product\ProductDoesNotTrackStock;
use App\Domains\Catalog\Domain\Product\ProductId;
use App\Domains\Catalog\Domain\Product\StockMovementType;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;
use PHPUnit\Framework\TestCase;

/** Pure domain tests — no database, no Laravel. */
class ProductTest extends TestCase
{
    public function test_starting_stock_is_recorded_as_an_initial_adjustment(): void
    {
        $product = Product::create(CompanyId::fromInt(1), 'Savon', costPrice: Money::fromDecimal(300), tracksStock: true, stockQuantity: 12);

        [$movement] = $product->newMovements();
        $this->assertSame(StockMovementType::Adjustment, $movement->type);
        $this->assertSame(12, $movement->quantityChange);
        $this->assertSame('Stock initial', $movement->note);
    }

    public function test_untracked_or_empty_products_start_without_movements(): void
    {
        $this->assertSame([], Product::create(CompanyId::fromInt(1), 'Coupe', stockQuantity: 5)->newMovements());
        $this->assertSame([], Product::create(CompanyId::fromInt(1), 'Savon', tracksStock: true)->newMovements());
    }

    public function test_restock_keeps_a_weighted_average_cost(): void
    {
        $product = $this->tracked(stock: 10, cost: '100.00');

        $movement = $product->restock(10, Money::fromDecimal(200), 'Marché');

        $this->assertSame(20, $product->stockQuantity());
        $this->assertSame('150.00', $product->costPrice()->toDecimalString());
        $this->assertSame('200.00', $movement->unitCost->toDecimalString(), 'the movement keeps the purchase price, not the average');
    }

    public function test_restock_rounds_the_average_to_the_centime(): void
    {
        $product = $this->tracked(stock: 2, cost: '100.00');

        $product->restock(1, Money::fromDecimal(101), null);

        $this->assertSame('100.33', $product->costPrice()->toDecimalString());
    }

    public function test_restocking_from_no_cost_uses_the_purchase_price(): void
    {
        $product = $this->tracked(stock: 0, cost: null);

        $product->restock(4, Money::fromDecimal(50), null);

        $this->assertSame('50.00', $product->costPrice()->toDecimalString());
    }

    public function test_a_correction_can_never_take_stock_below_zero(): void
    {
        $product = $this->tracked(stock: 2, cost: '10.00');

        $product->adjustStock(-2, 'Casse');
        $this->assertSame(0, $product->stockQuantity());

        $this->expectException(InsufficientStock::class);
        $product->adjustStock(-1, null);
    }

    public function test_an_online_sale_cannot_oversell_but_an_offline_one_can(): void
    {
        $product = $this->tracked(stock: 3, cost: '120.00');

        $product->recordSale(5, enforceStockLimit: false, transactionId: 9);
        $this->assertSame(-2, $product->stockQuantity());

        $this->expectException(InsufficientStock::class);
        $product->recordSale(1, enforceStockLimit: true, transactionId: 10);
    }

    public function test_a_sale_of_an_untracked_product_changes_nothing(): void
    {
        $product = Product::reconstitute(ProductId::fromInt(1), CompanyId::fromInt(1), 'Coupe', null, null, Money::fromDecimal(500), false, 0, null);

        $this->assertNull($product->recordSale(3, true, 1));
        $this->assertSame([], $product->newMovements());
    }

    public function test_stock_operations_require_stock_tracking(): void
    {
        $product = Product::reconstitute(ProductId::fromInt(1), CompanyId::fromInt(1), 'Coupe', null, null, null, false, 0, null);

        $this->expectException(ProductDoesNotTrackStock::class);
        $product->restock(1, Money::fromDecimal(1), null);
    }

    public function test_quantities_must_be_meaningful(): void
    {
        $this->expectException(InvalidStockQuantity::class);
        $this->tracked(stock: 1, cost: null)->adjustStock(0, null);
    }

    public function test_ownership_is_checked_by_company(): void
    {
        $product = $this->tracked(stock: 0, cost: null);

        $this->assertTrue($product->belongsTo(CompanyId::fromInt(1)));
        $this->assertFalse($product->belongsTo(CompanyId::fromInt(2)));
    }

    private function tracked(int $stock, ?string $cost): Product
    {
        return Product::reconstitute(
            ProductId::fromInt(1), CompanyId::fromInt(1), 'Savon', null, null,
            $cost !== null ? Money::fromDecimal($cost) : null, true, $stock, null,
        );
    }
}
