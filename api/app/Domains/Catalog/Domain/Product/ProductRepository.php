<?php

namespace App\Domains\Catalog\Domain\Product;

interface ProductRepository
{
    /** Locks the product for the rest of the current transaction, so concurrent stock writes serialize. */
    public function find(ProductId $id): ?Product;

    /** Persists the product and its new stock movements, assigning ids to whichever were new. */
    public function save(Product $product): void;

    /** Its stock movements go with it. */
    public function remove(Product $product): void;
}
