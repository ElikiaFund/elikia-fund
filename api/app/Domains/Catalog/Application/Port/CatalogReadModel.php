<?php

namespace App\Domains\Catalog\Application\Port;

/**
 * Read side of the Catalog. Rows are returned exactly as the API has always serialized them
 * (snake_case keys, decimals as "1500.00" strings), so moving to the domain model never changes
 * a JSON payload the mobile app or back-office depends on.
 */
interface CatalogReadModel
{
    /** @return list<array<string, mixed>> newest first, each with its `category` */
    public function products(int $companyId): array;

    /** @return array<string, mixed>|null with its `category` */
    public function product(int $productId): ?array;

    /** @return list<array<string, mixed>> newest first */
    public function stockMovements(int $productId): array;

    /** @return array<string, mixed>|null */
    public function stockMovement(int $movementId): ?array;

    /** @return list<array<string, mixed>> sorted by name */
    public function categories(int $companyId): array;

    /** @return array<string, mixed>|null */
    public function category(int $categoryId): ?array;
}
