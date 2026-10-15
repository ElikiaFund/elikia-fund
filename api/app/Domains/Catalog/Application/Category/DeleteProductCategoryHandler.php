<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;

final class DeleteProductCategoryHandler
{
    public function __construct(
        private readonly CompanyCategories $companyCategories,
        private readonly ProductCategoryRepository $categories,
    ) {}

    public function __invoke(DeleteProductCategory $command): void
    {
        $this->categories->remove($this->companyCategories->get($command->categoryId, $command->companyId));
    }
}
