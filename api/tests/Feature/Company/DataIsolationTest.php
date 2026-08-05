<?php

namespace Tests\Feature\Company;

use App\Models\Company;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Proves the "highly isolated" requirement behind the multi-company migration: every
 * company-scoped request must be provably owned by the authenticated user, on every request,
 * server-side — never inferred, never trusted from the client. See
 * App\Http\Middleware\ResolveActiveCompany, the sole gate this depends on.
 */
class DataIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_company_cannot_be_accessed_via_another_users_request(): void
    {
        $ownerA = User::factory()->create();
        $companyA = Company::factory()->create(['user_id' => $ownerA->id]);
        Transaction::factory()->create(['company_id' => $companyA->id]);

        $userB = User::factory()->create();
        Company::factory()->create(['user_id' => $userB->id]);

        Sanctum::actingAs($userB, ['*']);

        $response = $this->getJson('/api/transactions', ['X-Company-Id' => (string) $companyA->id]);

        $response->assertStatus(403);
    }

    public function test_a_users_own_two_companies_stay_isolated_from_each_other(): void
    {
        $user = User::factory()->create();

        $companyA = Company::factory()->create(['user_id' => $user->id]);
        $companyB = Company::factory()->create(['user_id' => $user->id]);

        $transactionA = Transaction::factory()->create(['company_id' => $companyA->id]);
        Transaction::factory()->create(['company_id' => $companyB->id]);

        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/transactions', ['X-Company-Id' => (string) $companyA->id]);

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonFragment(['id' => $transactionA->id]);
        $response->assertJsonMissing(['company_id' => $companyB->id]);
    }

    public function test_a_missing_x_company_id_header_is_rejected(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user, ['*']);

        $response = $this->getJson('/api/transactions');

        $response->assertStatus(400);
        $this->assertSame('Une entreprise active est requise.', $response->json('message'));
    }
}
