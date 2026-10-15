<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Domain\Category\ProductCategory;
use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;
use App\Domains\Shared\Domain\CompanyId;

final class CreateProductCategoryHandler
{
    public function __construct(private readonly ProductCategoryRepository $categories) {}

    public function __invoke(CreateProductCategory $command): int
    {
        $category = ProductCategory::create(CompanyId::fromInt($command->companyId), $command->name, $command->icon, $command->color);

        $this->categories->save($category);

        return $category->id()->value;
    }
}
