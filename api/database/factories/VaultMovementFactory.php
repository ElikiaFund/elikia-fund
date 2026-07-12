<?php

namespace Database\Factories;

use App\Models\Vault;
use App\Models\VaultMovement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VaultMovement>
 */
class VaultMovementFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'vault_id' => Vault::factory(),
            'type' => fake()->randomElement(['deposit', 'withdraw']),
            'amount' => fake()->randomFloat(2, 5000, 100000),
            'note' => fake()->boolean(20) ? fake()->sentence(3) : null,
        ];
    }
}
