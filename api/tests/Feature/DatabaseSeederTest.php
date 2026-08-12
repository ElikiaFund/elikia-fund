<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Models\Vault;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Smoke test for DatabaseSeeder — runs it against the in-memory test database (never the real
 * one) mainly to catch a broken factory/seeder interaction (e.g. a company-less user randomly
 * picked as a tontine owner) that a plain migration check wouldn't surface.
 */
class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_seeder_runs_cleanly_and_produces_company_isolated_data(): void
    {
        $this->seed();

        $this->assertGreaterThan(0, User::count());
        $this->assertGreaterThan(0, Company::count());
        $this->assertGreaterThan(0, Vault::count());
        $this->assertGreaterThan(0, Group::count());

        // Every vault belongs to a company (never a user directly), and every group/contribution
        // is attributed to one of its own owner's actual companies.
        Vault::query()->each(function (Vault $vault) {
            $this->assertNotNull($vault->company_id);
        });

        Group::query()->with('owner.companies')->each(function (Group $group) {
            $this->assertNotNull($group->company_id);
            $this->assertTrue(
                $group->owner->companies->contains('id', $group->company_id),
                "Group #{$group->id}'s company must belong to its own owner.",
            );
        });

        Contribution::query()->each(function (Contribution $contribution) {
            $this->assertSame($contribution->company_id, $contribution->group->company_id);
        });
    }
}
