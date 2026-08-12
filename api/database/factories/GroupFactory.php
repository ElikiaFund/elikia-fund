<?php

namespace Database\Factories;

use App\Models\Company;
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
        // A tontine's company must belong to its own owner — built together here so a bare
        // Group::factory()->create() (no explicit ->for()/state overrides) is always
        // self-consistent, not just structurally valid.
        $owner = User::factory()->create();

        return [
            'uuid' => Str::uuid(),
            'name' => fake()->randomElement(self::NAMES),
            'contribution_amount' => fake()->randomElement([10000, 15000, 20000, 25000, 50000]),
            'frequency' => fake()->randomElement(['weekly', 'monthly']),
            'recipient_mode' => 'join_order',
            'invite_code' => Str::upper(Str::random(6)),
            'owner_id' => $owner->id,
            'company_id' => Company::factory()->for($owner, 'user')->create()->id,
            // Explicit rather than relying on the DB column defaults — Eloquent's in-memory model
            // after create() doesn't reflect a column default unless it was actually set here,
            // which matters the moment anything (e.g. GroupCycleRecipientService) reads it back
            // off the just-created instance instead of a fresh() reload.
            'auto_payout_enabled' => true,
            'round_number' => 1,
            'round_status' => 'active',
        ];
    }
}
