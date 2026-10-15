<?php

use App\Domains\Catalog\Infrastructure\Providers\CatalogServiceProvider;
use App\Domains\Shared\Infrastructure\Providers\SharedServiceProvider;
use App\Providers\AppServiceProvider;

return [
    AppServiceProvider::class,
    SharedServiceProvider::class,
    CatalogServiceProvider::class,
];
