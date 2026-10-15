<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Command;

/** Gives a new company the default categories of its sector. Idempotent: existing names are kept. */
final readonly class SeedDefaultProductCategories implements Command
{
    public function __construct(
        public int $companyId,
        public string $sector,
    ) {}
}
