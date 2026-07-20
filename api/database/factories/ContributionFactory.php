<?php

namespace Database\Factories;

use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Contribution>
 */
class ContributionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $paidAt = fake()->dateTimeBetween('-90 days', 'now');
        $amount = fake()->randomElement([10000, 15000, 20000, 25000, 50000]);
        $feeAmount = round($amount * 0.03, 2);

        return [
            'group_id' => Group::factory(),
            'user_id' => User::factory(),
            'amount' => $amount,
            'fee_amount' => $feeAmount,
            'net_amount' => $amount - $feeAmount,
            'cycle_period' => $paidAt->format('Y-m'),
            'paid_at' => $paidAt,
        ];
    }
}
