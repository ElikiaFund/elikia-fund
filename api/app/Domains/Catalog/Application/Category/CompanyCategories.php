<?php

namespace App\Domains\Catalog\Application\Category;

use App\Domains\Catalog\Domain\Category\ProductCategory;
use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;
use App\Domains\Shared\Application\Exception\AccessDenied;
use App\Domains\Shared\Application\Exception\NotFound;
use App\Domains\Shared\Domain\CompanyId;

/** Loads a category for a write use case and enforces that it belongs to the acting company. */
final class CompanyCategories
{
    public function __construct(private readonly ProductCategoryRepository $categories) {}

    public function get(int $categoryId, int $companyId): ProductCategory
    {
        $category = $this->categories->find(ProductCategoryId::fromInt($categoryId))
            ?? throw NotFound::resource('ProductCategory', $categoryId);

        if (! $category->belongsTo(CompanyId::fromInt($companyId))) {
            throw AccessDenied::toResource('ProductCategory', $categoryId);
        }

        return $category;
    }
}
