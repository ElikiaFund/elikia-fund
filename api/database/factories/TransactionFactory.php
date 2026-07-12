<?php

namespace Database\Factories;

use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Transaction>
 */
class TransactionFactory extends Factory
{
    private const INCOME_CATEGORIES = ['Salaire', 'Vente', 'Aide familiale', 'Freelance'];

    private const EXPENSE_CATEGORIES = ['Loyer', 'Alimentation', 'Transport', 'Santé', 'Scolarité', 'Cotisation tontine'];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $type = fake()->randomElement(['income', 'expense']);

        return [
            'uuid' => Str::uuid(),
            'user_id' => User::factory(),
            'type' => $type,
            'amount' => $type === 'income'
                ? fake()->randomFloat(2, 40000, 220000)
                : fake()->randomFloat(2, 3000, 60000),
            'category' => fake()->randomElement($type === 'income' ? self::INCOME_CATEGORIES : self::EXPENSE_CATEGORIES),
            'note' => fake()->boolean(30) ? fake()->sentence(4) : null,
            'occurred_at' => fake()->dateTimeBetween('-90 days', 'now'),
        ];
    }

    public function income(): static
    {
        return $this->state(fn () => [
            'type' => 'income',
            'amount' => fake()->randomFloat(2, 40000, 220000),
            'category' => fake()->randomElement(self::INCOME_CATEGORIES),
        ]);
    }

    public function expense(): static
    {
        return $this->state(fn () => [
            'type' => 'expense',
            'amount' => fake()->randomFloat(2, 3000, 60000),
            'category' => fake()->randomElement(self::EXPENSE_CATEGORIES),
        ]);
    }
}
