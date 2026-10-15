<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Shared\Application\Bus\Command;

/** Handled by CreateProductCategoryHandler, which returns the new category's id. */
final readonly class CreateProductCategory implements Command
{
    public function __construct(
        public int $companyId,
        public string $name,
        public ?string $icon = null,
        public ?string $color = null,
    ) {}
}
