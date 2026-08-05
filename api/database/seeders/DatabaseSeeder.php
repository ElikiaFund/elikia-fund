<?php

namespace Database\Seeders;

use App\Models\CashSession;
use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\GroupMember;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Vault;
use Database\Factories\ProductFactory;
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
            'email' => 'admin@elikiafund.com',
            'role_id' => $superAdmin->id,
        ]);

        User::factory()->create([
            'name' => 'Support Elikia Fund',
            'email' => 'support@elikiafund.com',
            'role_id' => $support->id,
        ]);

        $users = User::factory()
            ->count(30)
            ->create()
            ->each(function (User $user) {
                if (fake()->boolean(70)) {
                    // Most qualifying users get exactly 1 company; a minority get 2-3, so the
                    // mobile switcher has real multi-company users to demo against.
                    $companyCount = fake()->randomElement([1, 1, 1, 1, 1, 1, 1, 2, 2, 3]);

                    for ($i = 0; $i < $companyCount; $i++) {
                        $company = Company::factory()->create(['user_id' => $user->id]);

                        if (array_key_exists($company->category, ProductFactory::CATALOG)) {
                            ProductCategory::seedDefaultsFor($company);
                            $tracksStock = $company->category !== 'services';

                            foreach (ProductFactory::CATALOG[$company->category] as $item) {
                                $categoryId = ProductCategory::where('company_id', $company->id)->where('name', $item['category'])->value('id');

                                Product::factory()->create([
                                    'company_id' => $company->id,
                                    'name' => $item['name'],
                                    'category_id' => $categoryId,
                                    'sell_price' => $item['unit_price'],
                                    'cost_price' => round($item['unit_price'] * fake()->randomFloat(2, 0.5, 0.8), 2),
                                    'tracks_stock' => $tracksStock,
                                    'stock_quantity' => $tracksStock ? fake()->numberBetween(0, 50) : 0,
                                ]);
                            }
                        }

                        Transaction::factory()
                            ->count(fake()->numberBetween(5, 15))
                            ->create(['company_id' => $company->id]);

                        CashSession::factory()
                            ->count(fake()->numberBetween(0, 4))
                            ->create(['company_id' => $company->id]);
                    }

                    $user->forceFill(['onboarding_completed_at' => now()])->save();
                }

                $vault = Vault::factory()->make(['user_id' => $user->id]);

                if (fake()->boolean(60)) {
                    $vault->pin_hash = bcrypt('1234');
                    $vault->pin_set_at = now();
                }

                $vault->save();
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
                    // Distinct calendar months, not independent random draws — the factory's
                    // own cycle_period (derived from a random paid_at within the last 90 days)
                    // can otherwise collide across rows for the same (group, member) pair and
                    // violate contributions' active_dedupe_key unique constraint.
                    collect(range(0, fake()->numberBetween(0, 3)))
                        ->map(fn (int $monthsAgo) => now()->subMonthsNoOverflow($monthsAgo))
                        ->unique(fn ($date) => $date->format('Y-m'))
                        ->each(fn ($date) => Contribution::factory()->create([
                            'group_id' => $group->id,
                            'user_id' => $member->id,
                            'cycle_period' => $date->format('Y-m'),
                            'paid_at' => $date,
                        ]));
                }
            }
        }
    }
}
