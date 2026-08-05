<?php

namespace Database\Factories;

use App\Models\CashSession;
use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<CashSession>
 */
class CashSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $expected = fake()->randomFloat(2, 20000, 300000);
        $counted = round($expected + fake()->randomFloat(2, -3000, 3000), 2);

        return [
            'uuid' => Str::uuid(),
            'company_id' => Company::factory(),
            'period_start' => fake()->boolean(70) ? fake()->dateTimeBetween('-60 days', '-30 days') : null,
            'closed_at' => fake()->dateTimeBetween('-30 days', 'now'),
            'expected_balance' => $expected,
            'counted_balance' => $counted,
            'variance' => round($counted - $expected, 2),
            'notes' => fake()->boolean(20) ? fake()->sentence(6) : null,
        ];
    }
}
