<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    /**
     * Sample catalogs per company category — used to seed realistic demo data, not shown to users.
     */
    public const CATALOG = [
        'commerce' => [
            ['name' => 'Boisson', 'category' => 'Boissons', 'unit_price' => 500],
            ['name' => 'Pain', 'category' => 'Alimentation', 'unit_price' => 200],
            ['name' => 'Boîte de lait', 'category' => 'Alimentation', 'unit_price' => 800],
            ['name' => 'Paquet de sucre', 'category' => 'Alimentation', 'unit_price' => 1000],
            ['name' => 'Savon', 'category' => 'Hygiène', 'unit_price' => 300],
        ],
        'restauration' => [
            ['name' => 'Poulet braisé', 'category' => 'Plats', 'unit_price' => 3000],
            ['name' => 'Riz au poisson', 'category' => 'Plats', 'unit_price' => 2500],
            ['name' => 'Jus de fruit', 'category' => 'Boissons', 'unit_price' => 700],
            ['name' => 'Eau minérale', 'category' => 'Boissons', 'unit_price' => 300],
        ],
        'services' => [
            ['name' => 'Coupe de cheveux', 'category' => 'Prestation', 'unit_price' => 1500],
            ['name' => 'Réparation', 'category' => 'Prestation', 'unit_price' => 5000],
            ['name' => 'Consultation', 'category' => 'Prestation', 'unit_price' => 2000],
        ],
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $item = fake()->randomElement(self::CATALOG['commerce']);

        return [
            'user_id' => User::factory(),
            'name' => $item['name'],
            'category' => $item['category'],
            'unit_price' => $item['unit_price'],
        ];
    }
}
