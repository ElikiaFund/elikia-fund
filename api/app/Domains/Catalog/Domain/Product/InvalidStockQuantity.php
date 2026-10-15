<?php

namespace App\Domains\Catalog\Domain\Product;

use App\Domains\Shared\Domain\DomainException;

final class InvalidStockQuantity extends DomainException
{
    public static function mustBePositive(): self
    {
        return new self('La quantité doit être supérieure à zéro.');
    }

    public static function mustNotBeZero(): self
    {
        return new self('La correction de stock ne peut pas être nulle.');
    }
}
