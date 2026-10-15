<?php

namespace App\Domains\Catalog\Domain\Category;

use App\Domains\Shared\Domain\CompanyId;

interface ProductCategoryRepository
{
    public function find(ProductCategoryId $id): ?ProductCategory;

    public function findByName(CompanyId $companyId, string $name): ?ProductCategory;

    public function save(ProductCategory $category): void;

    /** Products in the category become uncategorized; they are not deleted. */
    public function remove(ProductCategory $category): void;
}
