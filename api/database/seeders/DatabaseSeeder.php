<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vault;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Back-office admin login (dev only — password is "password", see api/README.md).
        User::factory()->create([
            'name' => 'Admin Elikia Fund',
            'email' => 'admin@elikia-fund.test',
            'is_admin' => true,
        ]);

        $users = User::factory()
            ->count(30)
            ->create()
            ->each(function (User $user) {
                if (fake()->boolean(70)) {
                    Company::factory()->create(['user_id' => $user->id]);
                    $user->forceFill(['onboarding_completed_at' => now()])->save();
                }

                $vault = Vault::factory()->make(['user_id' => $user->id]);

                if (fake()->boolean(60)) {
                    $vault->pin_hash = bcrypt('1234');
                    $vault->pin_set_at = now();
                }

                $vault->save();

                Transaction::factory()
                    ->count(fake()->numberBetween(5, 15))
                    ->create(['user_id' => $user->id]);
            });

        $groups = Group::factory()
            ->count(5)
            ->sequence(fn () => ['owner_id' => $users->random()->id])
            ->create();

        foreach ($groups as $group) {
            $members = $users->random(fake()->numberBetween(4, 10));

            foreach ($members as $member) {
                GroupMember::factory()->create([
                    'group_id' => $group->id,
                    'user_id' => $member->id,
                ]);

                if (fake()->boolean(70)) {
                    Contribution::factory()
                        ->count(fake()->numberBetween(1, 4))
                        ->create([
                            'group_id' => $group->id,
                            'user_id' => $member->id,
                        ]);
                }
            }
        }
    }
}
