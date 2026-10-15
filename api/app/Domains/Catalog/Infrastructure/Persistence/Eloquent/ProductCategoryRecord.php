<?php

namespace App\Domains\Catalog\Infrastructure\Persistence\Eloquent;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['company_id', 'name', 'icon', 'color'])]
class ProductCategoryRecord extends Model
{
    protected $table = 'product_categories';

    public function products(): HasMany
    {
        return $this->hasMany(ProductRecord::class, 'category_id');
    }
}
