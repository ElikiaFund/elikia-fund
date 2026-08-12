<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\GroupRoundGoal;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GroupRoundGoal>
 */
class GroupRoundGoalFactory extends Factory
{
    private const GOALS = [
        'Construire un projet immobilier',
        "Acheter du matériel pour l'atelier",
        'Financer une formation professionnelle',
        'Constituer un fonds de secours',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $group = Group::factory()->objectiveBased();

        return [
            'group_id' => $group,
            'round_number' => 1,
            'goal_text' => fake()->randomElement(self::GOALS),
            'target_amount' => fake()->randomElement([100000, 250000, 500000, 1000000]),
        ];
    }
}
