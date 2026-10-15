<?php

namespace App\Domains\Catalog\Domain\Product;

use App\Domains\Shared\Domain\DomainException;

final class ProductDoesNotTrackStock extends DomainException
{
    public function __construct()
    {
        parent::__construct('Ce produit ne suit pas de stock.');
    }
}
