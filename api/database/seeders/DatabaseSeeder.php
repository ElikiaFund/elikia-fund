<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\Permission;
use App\Models\Role;
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
        $this->call(PermissionSeeder::class);
        $this->call(SettingsSeeder::class);
        $this->call(ScoringCriteriaSeeder::class);

        $superAdmin = Role::create(['name' => 'Super Admin', 'description' => 'Accès complet au back-office.']);
        $superAdmin->permissions()->sync(Permission::pluck('id'));

        $support = Role::create(['name' => 'Support', 'description' => 'Accès en lecture seule.']);
        $support->permissions()->sync(Permission::whereIn('key', ['users.view', 'transactions.view', 'groups.view', 'companies.view'])->pluck('id'));

        // Back-office admin login (dev only — password is "password", see api/README.md).
        User::factory()->create([
            'name' => 'Admin Elikia Fund',
            'email' => 'admin@elikia-fund.test',
            'role_id' => $superAdmin->id,
        ]);

        User::factory()->create([
            'name' => 'Support Elikia Fund',
            'email' => 'support@elikia-fund.test',
            'role_id' => $support->id,
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
