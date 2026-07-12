<?php

namespace Database\Factories;

use App\Models\Group;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Group>
 */
class GroupFactory extends Factory
{
    private const NAMES = [
        'Tontine des Commerçantes',
        'Cercle Elikia Bandal',
        'Groupe Bakala Solidarité',
        'Tontine Familiale Loemba',
        'Cercle Espoir Poto-Poto',
        'Tontine des Enseignants',
        'Groupe Entraide Talangaï',
    ];

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'uuid' => Str::uuid(),
            'name' => fake()->randomElement(self::NAMES),
            'contribution_amount' => fake()->randomElement([10000, 15000, 20000, 25000, 50000]),
            'frequency' => fake()->randomElement(['weekly', 'monthly']),
            'invite_code' => Str::upper(Str::random(6)),
            'owner_id' => User::factory(),
        ];
    }
}
