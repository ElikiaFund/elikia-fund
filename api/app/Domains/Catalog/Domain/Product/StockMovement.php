<?php

namespace App\Domains\Catalog\Domain\Product;

use App\Domains\Shared\Domain\Money;
use LogicException;

/**
 * One line of a product's stock ledger. Append-only: the sum of a product's movements always
 * equals its stock_quantity, which is why even the starting stock is recorded as a movement.
 */
final class StockMovement
{
    private ?StockMovementId $id = null;

    private function __construct(
        public readonly StockMovementType $type,
        public readonly int $quantityChange,
        public readonly ?Money $unitCost,
        public readonly ?string $note,
        private ?int $transactionId,
    ) {}

    public static function record(StockMovementType $type, int $quantityChange, ?Money $unitCost, ?string $note = null, ?int $transactionId = null): self
    {
        return new self($type, $quantityChange, $unitCost, $note, $transactionId);
    }

    /** Links a not-yet-saved movement to the Bookkeeping transaction it caused or was caused by. */
    public function linkToTransaction(int $transactionId): void
    {
        if ($this->id !== null) {
            throw new LogicException('A saved stock movement is immutable.');
        }

        $this->transactionId = $transactionId;
    }

    public function id(): ?StockMovementId
    {
        return $this->id;
    }

    public function transactionId(): ?int
    {
        return $this->transactionId;
    }

    /** @internal Called by the repository once the row exists. */
    public function assignId(StockMovementId $id): void
    {
        $this->id ??= $id;
    }
}
