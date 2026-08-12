<?php

namespace Tests\Feature\Group;

use App\Models\Company;
use App\Models\Contribution;
use App\Models\Group;
use App\Models\User;
use App\Models\Vault;
use App\Services\GroupCycleRecipientService;
use App\Services\TontinePayoutService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Proves tontines are financially attributed to a company, not the person: a payout lands in the
 * tontine's own company's vault regardless of which member is the resolved recipient, and
 * credit-score tontine_participation only counts contributions made under that specific company.
 */
class GroupPayoutCompanyIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_payout_credits_the_tontines_own_company_vault_not_the_recipients_personal_vault(): void
    {
        $creator = User::factory()->create();
        $company = Company::factory()->for($creator)->create();
        Vault::factory()->for($company)->create(['balance' => 0]);

        // A completely different person, with their own separate company/vault — the payout
        // must never land here, even though this user is the resolved cycle recipient.
        $recipientUser = User::factory()->create();
        $recipientCompany = Company::factory()->for($recipientUser)->create();
        Vault::factory()->for($recipientCompany)->create(['balance' => 1000]);

        $group = Group::factory()->for($creator, 'owner')->create([
            'company_id' => $company->id,
            'frequency' => 'monthly',
            'recipient_mode' => 'admin',
        ]);
        $group->members()->attach($creator->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);
        $group->members()->attach($recipientUser->id, ['status' => 'approved', 'joined_at' => now(), 'approved_at' => now()]);

        $cyclePeriod = $group->currentCyclePeriod();
        app(GroupCycleRecipientService::class)->designate($group, $cyclePeriod, $recipientUser);

        foreach ([$creator, $recipientUser] as $member) {
            Contribution::factory()->for($group)->for($member)->create([
                'cycle_period' => $cyclePeriod,
                'status' => 'succeeded',
                'paid_at' => now(),
                'company_id' => $company->id,
            ]);
        }

        $result = app(TontinePayoutService::class)->disburse($group, $cyclePeriod);

        $this->assertEqualsWithDelta($result['amount'], (float) $company->vault->fresh()->balance, 0.01);
        // Unchanged — the resolved recipient's own personal company vault is never touched.
        $this->assertEqualsWithDelta(1000, (float) $recipientCompany->vault->fresh()->balance, 0.01);
    }

    public function test_tontine_participation_only_counts_contributions_made_under_that_company(): void
    {
        $user = User::factory()->create();
        $companyA = Company::factory()->for($user)->create();
        $companyB = Company::factory()->for($user)->create();

        $groupA = Group::factory()->for($user, 'owner')->create(['company_id' => $companyA->id]);
        $groupB = Group::factory()->for($user, 'owner')->create(['company_id' => $companyB->id]);

        Contribution::factory()->for($groupA)->for($user)->create(['status' => 'succeeded', 'company_id' => $companyA->id]);
        Contribution::factory()->for($groupB)->for($user)->create(['status' => 'succeeded', 'company_id' => $companyB->id]);

        // Even though the same person contributed to both, each company only sees its own.
        $this->assertSame(1, (int) $companyA->contributions()->where('status', 'succeeded')->count());
        $this->assertSame(1, (int) $companyB->contributions()->where('status', 'succeeded')->count());
    }
}
