<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $department = fake()->randomElement(Company::DEPARTMENTS);

        return [
            'user_id' => User::factory(),
            'name' => fake()->company(),
            'category' => fake()->randomElement(Company::CATEGORIES),
            'department' => $department,
            'city' => Company::DEPARTMENT_CAPITALS[$department],
        ];
    }
}
