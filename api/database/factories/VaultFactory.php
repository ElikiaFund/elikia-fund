<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Vault;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Vault>
 */
class VaultFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'balance' => fake()->randomFloat(2, 0, 500000),
        ];
    }

    /**
     * pin_hash is deliberately outside $fillable, so it's set via direct attribute
     * assignment here (afterMaking) rather than through the mass-assignable definition().
     */
    public function activated(): static
    {
        return $this->afterMaking(function (Vault $vault) {
            $vault->pin_hash = Hash::make('1234');
            $vault->pin_set_at = now();
        });
    }
}
