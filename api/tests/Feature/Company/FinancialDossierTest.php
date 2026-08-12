<?php

namespace Tests\Feature\Company;

use App\Models\Company;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Smoke-tests the "Dossier de crédibilité financière" PDF endpoint — mostly to catch a broken
 * Blade view/dompdf render (missing variable, invalid HTML) before it ships, not to assert on
 * PDF byte content.
 */
class FinancialDossierTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_download_a_companys_financial_dossier(): void
    {
        $owner = User::factory()->create();
        $company = Company::factory()->create(['user_id' => $owner->id]);
        Transaction::factory()->count(3)->create(['company_id' => $company->id, 'type' => 'income']);

        $admin = User::factory()->create(['role_id' => Role::factory()->create(['name' => 'Support'])->id]);
        Sanctum::actingAs($admin, ['*']);

        $response = $this->get("/api/admin/companies/{$company->id}/financial-dossier");

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');
    }
}
