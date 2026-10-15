<?php

namespace App\Domains\Catalog\Domain\Product;

use App\Domains\Shared\Domain\DomainException;

final class InsufficientStock extends DomainException
{
    public function __construct()
    {
        parent::__construct('Stock insuffisant pour ce produit.');
    }
}
