<?php

namespace Tests\Feature\Catalog;

use App\Models\Company;
use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Pins the catalog endpoints' observable behaviour — status codes, French messages, stock and
 * cost side-effects — so the move to the Catalog bounded context (docs/architecture/ddd.md) can be
 * proven not to change anything the mobile app or back-office relies on.
 */
class CatalogHttpContractTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private Company $company;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create();
        $this->company = Company::factory()->create(['user_id' => $this->owner->id, 'category' => 'commerce']);
        Sanctum::actingAs($this->owner, ['*']);
    }

    public function test_creating_a_product_with_starting_stock_records_the_initial_movement(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 12, 'cost_price' => 300])
            ->assertCreated()
            ->assertJsonPath('name', 'Savon')
            ->json('id');

        $this->assertDatabaseHas('stock_movements', ['product_id' => $id, 'type' => 'adjustment', 'quantity_change' => 12, 'note' => 'Stock initial']);
        $this->api('get', '/api/products')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', $id)->assertJsonStructure([['id', 'category']]);
    }

    public function test_a_product_without_stock_tracking_has_no_initial_movement(): void
    {
        $id = $this->createProduct(['stock_quantity' => 5])->json('id');

        $this->assertDatabaseCount('stock_movements', 0);
        $this->api('get', "/api/products/{$id}")->assertOk()->assertJsonPath('tracks_stock', false);
    }

    public function test_another_companys_product_is_forbidden_and_a_missing_one_is_not_found(): void
    {
        $foreign = $this->productFor(Company::factory()->create());

        $this->api('get', "/api/products/{$foreign}")->assertForbidden();
        $this->api('put', "/api/products/{$foreign}", ['name' => 'X'])->assertForbidden();
        $this->api('delete', "/api/products/{$foreign}")->assertForbidden();
        $this->api('get', '/api/products/999999')->assertNotFound()->assertJsonPath('message', 'Ressource introuvable.');
    }

    public function test_update_only_changes_the_fields_that_were_sent(): void
    {
        $id = $this->createProduct(['sell_price' => 500, 'tracks_stock' => true, 'stock_quantity' => 3])->json('id');

        $this->api('put', "/api/products/{$id}", ['name' => 'Savon de Marseille'])->assertOk()->assertJsonPath('name', 'Savon de Marseille');

        $this->assertDatabaseHas('products', ['id' => $id, 'name' => 'Savon de Marseille', 'sell_price' => 500, 'tracks_stock' => true, 'stock_quantity' => 3]);
    }

    public function test_restock_recomputes_the_weighted_average_cost_and_logs_an_expense(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 10, 'cost_price' => 100])->json('id');

        $response = $this->api('post', "/api/products/{$id}/restock", ['quantity' => 10, 'unit_cost' => 200, 'note' => 'Marché'])
            ->assertCreated()
            ->assertJsonPath('product.stock_quantity', 20)
            ->assertJsonPath('product.cost_price', '150.00')
            ->assertJsonPath('movement.type', 'restock')
            ->assertJsonPath('movement.quantity_change', 10);

        $transactionId = $response->json('transaction.id');
        $this->assertNotNull($transactionId);
        $this->assertDatabaseHas('transactions', ['id' => $transactionId, 'type' => 'expense', 'category' => 'achat_stock', 'amount' => 2000, 'product_id' => $id, 'company_id' => $this->company->id]);
        $this->assertDatabaseHas('stock_movements', ['id' => $response->json('movement.id'), 'transaction_id' => $transactionId]);
    }

    public function test_restock_can_skip_the_expense(): void
    {
        $id = $this->createProduct(['tracks_stock' => true])->json('id');

        $this->api('post', "/api/products/{$id}/restock", ['quantity' => 4, 'unit_cost' => 50, 'create_expense' => false])
            ->assertCreated()
            ->assertJsonPath('transaction', null)
            ->assertJsonPath('product.cost_price', '50.00');

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_stock_operations_are_refused_for_products_that_do_not_track_stock(): void
    {
        $id = $this->createProduct()->json('id');

        $this->api('post', "/api/products/{$id}/restock", ['quantity' => 1, 'unit_cost' => 1])
            ->assertStatus(422)->assertJsonPath('message', 'Ce produit ne suit pas de stock.');
        $this->api('post', "/api/products/{$id}/adjust-stock", ['quantity_change' => 1])
            ->assertStatus(422)->assertJsonPath('message', 'Ce produit ne suit pas de stock.');
    }

    public function test_an_adjustment_can_never_take_stock_below_zero(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 2])->json('id');

        $this->api('post', "/api/products/{$id}/adjust-stock", ['quantity_change' => -3])
            ->assertStatus(422)->assertJsonPath('message', 'Stock insuffisant pour ce produit.');

        $this->api('post', "/api/products/{$id}/adjust-stock", ['quantity_change' => -2, 'note' => 'Casse'])
            ->assertCreated()
            ->assertJsonPath('product.stock_quantity', 0)
            ->assertJsonPath('movement.quantity_change', -2);

        $this->api('get', "/api/products/{$id}/movements")->assertOk()->assertJsonCount(2);
    }

    public function test_an_online_sale_decrements_stock_snapshots_cost_and_refuses_overselling(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 3, 'cost_price' => 120])->json('id');

        $this->api('post', '/api/transactions', $this->sale($id, 5))
            ->assertStatus(422)->assertJsonPath('message', 'Stock insuffisant pour ce produit.');
        $this->assertDatabaseCount('transactions', 0);

        $transactionId = $this->api('post', '/api/transactions', $this->sale($id, 2))->assertCreated()->json('id');

        $this->assertDatabaseHas('products', ['id' => $id, 'stock_quantity' => 1]);
        $this->assertDatabaseHas('transactions', ['id' => $transactionId, 'unit_cost' => 120]);
        $this->assertDatabaseHas('stock_movements', ['product_id' => $id, 'type' => 'sale', 'quantity_change' => -2, 'transaction_id' => $transactionId]);
    }

    public function test_an_offline_sale_is_always_accepted_and_a_retried_batch_is_not_counted_twice(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 5])->json('id');
        $batch = ['transactions' => [$this->sale($id, 2)]];

        $this->api('post', '/api/sync', $batch)->assertOk()->assertJsonCount(1, 'accepted');
        $this->api('post', '/api/sync', $batch)->assertOk();

        $this->assertDatabaseHas('products', ['id' => $id, 'stock_quantity' => 3]);
        $this->assertSame(1, DB::table('stock_movements')->where('type', 'sale')->count());
    }

    public function test_deleting_a_product_removes_its_movements(): void
    {
        $id = $this->createProduct(['tracks_stock' => true, 'stock_quantity' => 1])->json('id');

        $this->api('delete', "/api/products/{$id}")->assertNoContent();

        $this->assertDatabaseMissing('products', ['id' => $id]);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_categories_are_listed_by_name_and_deleting_one_uncategorizes_its_products(): void
    {
        $zebra = $this->api('post', '/api/product-categories', ['name' => 'Zèbre'])->assertCreated()->json('id');
        $this->api('post', '/api/product-categories', ['name' => 'Ananas', 'color' => '#FFAA00'])->assertCreated();
        $this->api('post', '/api/product-categories', ['name' => 'Ananas'])->assertStatus(422);

        $this->api('get', '/api/product-categories')->assertOk()->assertJsonPath('0.name', 'Ananas')->assertJsonPath('1.name', 'Zèbre');

        $this->api('put', "/api/product-categories/{$zebra}", ['name' => 'Zébu', 'icon' => 'paw'])
            ->assertOk()->assertJsonPath('name', 'Zébu')->assertJsonPath('icon', 'paw');

        $productId = $this->createProduct(['category_id' => $zebra])->json('id');
        $this->api('delete', "/api/product-categories/{$zebra}")->assertNoContent();

        $this->assertDatabaseHas('products', ['id' => $productId, 'category_id' => null]);
    }

    public function test_another_companys_category_is_forbidden(): void
    {
        $foreign = DB::table('product_categories')->insertGetId([
            'company_id' => Company::factory()->create()->id, 'name' => 'Autre', 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->api('put', "/api/product-categories/{$foreign}", ['name' => 'Volé'])->assertForbidden();
        $this->api('delete', "/api/product-categories/{$foreign}")->assertForbidden();
    }

    public function test_a_new_company_gets_the_default_categories_of_its_sector(): void
    {
        $this->postJson('/api/companies', [
            'name' => 'Maquis Chez Ada', 'category' => 'restauration', 'department' => 'brazzaville',
            'city' => 'Brazzaville', 'neighborhood' => 'Bacongo',
        ])->assertCreated();

        $companyId = Company::where('name', 'Maquis Chez Ada')->value('id');
        $this->assertEqualsCanonicalizing(
            ['Plats', 'Boissons', 'Desserts'],
            DB::table('product_categories')->where('company_id', $companyId)->pluck('name')->all(),
        );
    }

    public function test_staff_with_the_permission_can_delete_any_product(): void
    {
        $id = $this->createProduct()->json('id');

        $role = Role::factory()->create(['name' => 'Ops']);
        $role->permissions()->attach(Permission::factory()->create(['key' => 'products.delete', 'label' => 'Supprimer des produits', 'group' => 'Produits']));
        Sanctum::actingAs(User::factory()->create(['role_id' => $role->id]), ['*']);

        $this->deleteJson("/api/admin/products/{$id}")->assertOk()->assertJsonPath('message', 'Produit supprimé.');
        $this->assertDatabaseMissing('products', ['id' => $id]);
    }

    private function createProduct(array $overrides = [])
    {
        return $this->api('post', '/api/products', ['name' => 'Savon', ...$overrides]);
    }

    private function productFor(Company $company): int
    {
        return DB::table('products')->insertGetId([
            'company_id' => $company->id, 'name' => 'Étranger', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function sale(int $productId, int $quantity): array
    {
        return [
            'uuid' => (string) Str::uuid(), 'type' => 'income', 'amount' => 1000, 'category' => 'vente',
            'payment_method' => 'cash', 'product_id' => $productId, 'quantity' => $quantity, 'occurred_at' => now()->toIso8601String(),
        ];
    }

    private function api(string $method, string $uri, array $data = [])
    {
        return $this->json($method, $uri, $data, ['X-Company-Id' => (string) $this->company->id]);
    }
}
