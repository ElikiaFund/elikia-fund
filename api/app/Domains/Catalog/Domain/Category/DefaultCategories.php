<?php

namespace App\Domains\Catalog\Domain\Category;

/**
 * The categories a new company starts with, by business sector (the company's `category`).
 * Same vocabulary the demo catalog in database/factories/ProductFactory.php uses, so seeded
 * products and a fresh merchant's categories agree with each other.
 */
final class DefaultCategories
{
    private const BY_SECTOR = [
        'commerce' => [
            ['name' => 'Boissons', 'icon' => 'wine-outline', 'color' => '#A069DA'],
            ['name' => 'Alimentation', 'icon' => 'fast-food-outline', 'color' => '#4C7A63'],
            ['name' => 'Hygiène', 'icon' => 'sparkles-outline', 'color' => '#6B9AC4'],
        ],
        'restauration' => [
            ['name' => 'Plats', 'icon' => 'restaurant-outline', 'color' => '#B5544A'],
            ['name' => 'Boissons', 'icon' => 'wine-outline', 'color' => '#A069DA'],
            ['name' => 'Desserts', 'icon' => 'ice-cream-outline', 'color' => '#D9A441'],
        ],
        'services' => [
            ['name' => 'Prestation', 'icon' => 'briefcase-outline', 'color' => '#6B675E'],
        ],
    ];

    /** @return list<array{name: string, icon: string, color: string}> */
    public static function forSector(string $sector): array
    {
        return self::BY_SECTOR[$sector] ?? [];
    }
}
