<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['user_id', 'name', 'icon', 'color'])]
class ProductCategory extends Model
{
    /**
     * Default categories seeded per company sector at onboarding — reuses the exact category
     * vocabulary ProductFactory::CATALOG already seeds demo products under, so a fresh user's
     * catalog and their default categories agree with each other from the start.
     */
    public const DEFAULT_CATALOG = [
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

    public static function seedDefaultsFor(Company $company): void
    {
        foreach (self::DEFAULT_CATALOG[$company->category] ?? [] as $item) {
            self::firstOrCreate(
                ['user_id' => $company->user_id, 'name' => $item['name']],
                ['icon' => $item['icon'], 'color' => $item['color']],
            );
        }
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}
