<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Domain\Category\DefaultCategories;
use App\Domains\Catalog\Domain\Category\ProductCategory;
use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;
use App\Domains\Shared\Domain\CompanyId;

final class SeedDefaultProductCategoriesHandler
{
    public function __construct(private readonly ProductCategoryRepository $categories) {}

    public function __invoke(SeedDefaultProductCategories $command): void
    {
        $companyId = CompanyId::fromInt($command->companyId);

        foreach (DefaultCategories::forSector($command->sector) as $default) {
            if ($this->categories->findByName($companyId, $default['name'])) {
                continue;
            }

            $this->categories->save(ProductCategory::create($companyId, $default['name'], $default['icon'], $default['color']));
        }
    }
}
