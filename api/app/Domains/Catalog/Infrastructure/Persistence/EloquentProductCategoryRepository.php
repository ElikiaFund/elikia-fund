<?php

namespace App\Domains\Catalog\Infrastructure\Persistence;

use App\Domains\Catalog\Domain\Category\ProductCategory;
use App\Domains\Catalog\Domain\Category\ProductCategoryId;
use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;
use App\Domains\Catalog\Infrastructure\Persistence\Eloquent\ProductCategoryRecord;
use App\Domains\Shared\Domain\CompanyId;

final class EloquentProductCategoryRepository implements ProductCategoryRepository
{
    public function find(ProductCategoryId $id): ?ProductCategory
    {
        $record = ProductCategoryRecord::find($id->value);

        return $record ? $this->toDomain($record) : null;
    }

    public function findByName(CompanyId $companyId, string $name): ?ProductCategory
    {
        $record = ProductCategoryRecord::where('company_id', $companyId->value)->where('name', $name)->first();

        return $record ? $this->toDomain($record) : null;
    }

    public function save(ProductCategory $category): void
    {
        $record = $category->id() ? ProductCategoryRecord::findOrFail($category->id()->value) : new ProductCategoryRecord;

        $record->fill([
            'company_id' => $category->companyId()->value,
            'name' => $category->name(),
            'icon' => $category->icon(),
            'color' => $category->color(),
        ])->save();

        $category->markPersisted(ProductCategoryId::fromInt($record->id));
    }

    public function remove(ProductCategory $category): void
    {
        // products.category_id is nullOnDelete, so products survive uncategorized.
        ProductCategoryRecord::whereKey($category->id()->value)->delete();
    }

    private function toDomain(ProductCategoryRecord $record): ProductCategory
    {
        return ProductCategory::reconstitute(
            ProductCategoryId::fromInt($record->id),
            CompanyId::fromInt($record->company_id),
            $record->name,
            $record->icon,
            $record->color,
        );
    }
}
