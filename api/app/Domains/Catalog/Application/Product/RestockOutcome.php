<?php

namespace App\Domains\Catalog\Application\Product;

final readonly class RestockOutcome
{
    public function __construct(
        public int $movementId,
        public ?int $expenseTransactionId,
    ) {}
}
