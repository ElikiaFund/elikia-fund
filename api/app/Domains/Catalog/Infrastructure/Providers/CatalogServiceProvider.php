<?php

namespace App\Domains\Catalog\Infrastructure\Providers;

use App\Domains\Catalog\Application\Port\CatalogReadModel;
use App\Domains\Catalog\Application\Port\ExpenseRecorder;
use App\Domains\Catalog\Domain\Category\ProductCategoryRepository;
use App\Domains\Catalog\Domain\Product\ProductRepository;
use App\Domains\Catalog\Infrastructure\Bookkeeping\LegacyTransactionExpenseRecorder;
use App\Domains\Catalog\Infrastructure\Persistence\EloquentProductCategoryRepository;
use App\Domains\Catalog\Infrastructure\Persistence\EloquentProductRepository;
use App\Domains\Catalog\Infrastructure\ReadModel\EloquentCatalogReadModel;
use Illuminate\Support\ServiceProvider;

final class CatalogServiceProvider extends ServiceProvider
{
    public array $bindings = [
        ProductRepository::class => EloquentProductRepository::class,
        ProductCategoryRepository::class => EloquentProductCategoryRepository::class,
        CatalogReadModel::class => EloquentCatalogReadModel::class,
        ExpenseRecorder::class => LegacyTransactionExpenseRecorder::class,
    ];
}
