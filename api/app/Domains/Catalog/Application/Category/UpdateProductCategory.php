<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Command;

/** Partial update: only the keys present in $changes (name, icon, color) are applied. */
final readonly class UpdateProductCategory implements Command
{
    public const FIELDS = ['name', 'icon', 'color'];

    /** @param array<string, ?string> $changes */
    public function __construct(
        public int $categoryId,
        public int $companyId,
        public array $changes,
    ) {}
}
