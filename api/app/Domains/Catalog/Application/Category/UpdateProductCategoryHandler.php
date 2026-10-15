<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;

final class UpdateProductCategoryHandler
{
    public function __construct(
        private readonly CompanyCategories $companyCategories,
        private readonly ProductCategoryRepository $categories,
    ) {}

    public function __invoke(UpdateProductCategory $command): void
    {
        $category = $this->companyCategories->get($command->categoryId, $command->companyId);

        if (array_key_exists('name', $command->changes)) {
            $category->rename($command->changes['name']);
        }

        if (array_key_exists('icon', $command->changes)) {
            $category->changeIcon($command->changes['icon']);
        }

        if (array_key_exists('color', $command->changes)) {
            $category->changeColor($command->changes['color']);
        }

        $this->categories->save($category);
    }
}
