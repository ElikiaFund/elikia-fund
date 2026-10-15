<?php

namespace App\Domains\Catalog\Domain\Product;

use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Shared\Domain\AggregateRoot;
use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\Money;

/**
 * An item a merchant sells — a drink, a dish, a service. When it tracks stock, every quantity
 * change goes through restock(), adjustStock() or recordSale() so it leaves a StockMovement, and
 * the cost price is a single running weighted average (no FIFO lots: a micro-business owner
 * can't track purchase batches by hand, and one averaged cost is enough for margin reporting).
 */
final class Product extends AggregateRoot
{
    /** @var list<StockMovement> */
    private array $newMovements = [];

    private function __construct(
        private ?ProductId $id,
        private readonly CompanyId $companyId,
        private string $name,
        private ?ProductCategoryId $categoryId,
        private ?Money $sellPrice,
        private ?Money $costPrice,
        private bool $tracksStock,
        private int $stockQuantity,
        private ?int $lowStockThreshold,
    ) {}

    public static function create(
        CompanyId $companyId,
        string $name,
        ?ProductCategoryId $categoryId = null,
        ?Money $sellPrice = null,
        ?Money $costPrice = null,
        bool $tracksStock = false,
        int $stockQuantity = 0,
        ?int $lowStockThreshold = null,
    ): self {
        $product = new self(null, $companyId, $name, $categoryId, $sellPrice, $costPrice, $tracksStock, $stockQuantity, $lowStockThreshold);

        // Recorded as a movement so "sum of movements == stock_quantity" holds from day one.
        if ($tracksStock && $stockQuantity > 0) {
            $product->newMovements[] = StockMovement::record(StockMovementType::Adjustment, $stockQuantity, $costPrice, 'Stock initial');
        }

        return $product;
    }

    /** Rebuilds a stored product — no invariants re-run, no movements recorded. */
    public static function reconstitute(
        ProductId $id,
        CompanyId $companyId,
        string $name,
        ?ProductCategoryId $categoryId,
        ?Money $sellPrice,
        ?Money $costPrice,
        bool $tracksStock,
        int $stockQuantity,
        ?int $lowStockThreshold,
    ): self {
        return new self($id, $companyId, $name, $categoryId, $sellPrice, $costPrice, $tracksStock, $stockQuantity, $lowStockThreshold);
    }

    public function rename(string $name): void
    {
        $this->name = $name;
    }

    public function moveToCategory(?ProductCategoryId $categoryId): void
    {
        $this->categoryId = $categoryId;
    }

    public function changeSellPrice(?Money $sellPrice): void
    {
        $this->sellPrice = $sellPrice;
    }

    public function changeCostPrice(?Money $costPrice): void
    {
        $this->costPrice = $costPrice;
    }

    public function changeStockTracking(bool $tracksStock): void
    {
        $this->tracksStock = $tracksStock;
    }

    public function changeLowStockThreshold(?int $threshold): void
    {
        $this->lowStockThreshold = $threshold;
    }

    /**
     * Adds stock bought at $unitCost and recomputes the running average:
     * new_cost = (old_qty × old_cost + quantity × unit_cost) / (old_qty + quantity).
     */
    public function restock(int $quantity, Money $unitCost, ?string $note): StockMovement
    {
        $this->assertTracksStock();

        if ($quantity < 1) {
            throw InvalidStockQuantity::mustBePositive();
        }

        $oldQuantity = $this->stockQuantity;
        $oldCost = $this->costPrice?->minorUnits ?? 0;
        $newQuantity = $oldQuantity + $quantity;

        $averageCost = $newQuantity > 0
            ? (int) round((($oldQuantity * $oldCost) + ($quantity * $unitCost->minorUnits)) / $newQuantity)
            : $unitCost->minorUnits;

        $this->stockQuantity = $newQuantity;
        $this->costPrice = Money::ofMinor($averageCost, $unitCost->currency);

        return $this->newMovements[] = StockMovement::record(StockMovementType::Restock, $quantity, $unitCost, $note);
    }

    /**
     * A deliberate correction (loss, breakage, recount) made in the moment — so unlike an offline
     * sale it is always refused if it would take stock below zero.
     */
    public function adjustStock(int $quantityChange, ?string $note): StockMovement
    {
        $this->assertTracksStock();

        if ($quantityChange === 0) {
            throw InvalidStockQuantity::mustNotBeZero();
        }

        if ($quantityChange < 0 && abs($quantityChange) > $this->stockQuantity) {
            throw new InsufficientStock;
        }

        $this->stockQuantity += $quantityChange;

        return $this->newMovements[] = StockMovement::record(StockMovementType::Adjustment, $quantityChange, $this->costPrice, $note);
    }

    /**
     * A sale recorded in Bookkeeping. Online sales enforce the stock limit; offline sales don't,
     * because the sale already physically happened by the time it syncs and refusing it would
     * strand it on the phone with no way to resolve it. Untracked products just pass through.
     */
    public function recordSale(int $quantity, bool $enforceStockLimit, int $transactionId): ?StockMovement
    {
        if (! $this->tracksStock) {
            return null;
        }

        if ($enforceStockLimit && $quantity > $this->stockQuantity) {
            throw new InsufficientStock;
        }

        $this->stockQuantity -= $quantity;

        return $this->newMovements[] = StockMovement::record(StockMovementType::Sale, -$quantity, $this->costPrice, null, $transactionId);
    }

    public function belongsTo(CompanyId $companyId): bool
    {
        return $this->companyId->equals($companyId);
    }

    /** @return list<StockMovement> movements recorded since the product was loaded or created */
    public function newMovements(): array
    {
        return $this->newMovements;
    }

    /** @internal Called by the repository after a successful save. */
    public function markPersisted(ProductId $id): void
    {
        $this->id ??= $id;
        $this->newMovements = [];
    }

    public function id(): ?ProductId
    {
        return $this->id;
    }

    public function companyId(): CompanyId
    {
        return $this->companyId;
    }

    public function name(): string
    {
        return $this->name;
    }

    public function categoryId(): ?ProductCategoryId
    {
        return $this->categoryId;
    }

    public function sellPrice(): ?Money
    {
        return $this->sellPrice;
    }

    public function costPrice(): ?Money
    {
        return $this->costPrice;
    }

    public function tracksStock(): bool
    {
        return $this->tracksStock;
    }

    public function stockQuantity(): int
    {
        return $this->stockQuantity;
    }

    public function lowStockThreshold(): ?int
    {
        return $this->lowStockThreshold;
    }

    private function assertTracksStock(): void
    {
        if (! $this->tracksStock) {
            throw new ProductDoesNotTrackStock;
        }
    }
}
