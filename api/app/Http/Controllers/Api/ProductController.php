<?php

namespace App\Http\Controllers\Api;

use App\Domains\Catalog\Application\Product\AdjustProductStock;
use App\Domains\Catalog\Application\Product\CreateProduct;
use App\Domains\Catalog\Application\Product\DeleteProduct;
use App\Domains\Catalog\Application\Product\GetProduct;
use App\Domains\Catalog\Application\Product\GetStockMovement;
use App\Domains\Catalog\Application\Product\ListProducts;
use App\Domains\Catalog\Application\Product\ListStockMovements;
use App\Domains\Catalog\Application\Product\RestockProduct;
use App\Domains\Catalog\Application\Product\UpdateProduct;
use App\Domains\Shared\Application\Bus\CommandBus;
use App\Domains\Shared\Application\Bus\QueryBus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Product\AdjustStockRequest;
use App\Http\Requests\Product\RestockProductRequest;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The active company's catalog. Business rules (stock can't go below zero on a correction,
 * weighted-average cost on restock, …) live in the Catalog context — see
 * app/Domains/Catalog and docs/architecture/ddd.md.
 */
class ProductController extends Controller
{
    public function __construct(
        private readonly CommandBus $commands,
        private readonly QueryBus $queries,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->queries->ask(new ListProducts($request->company()->id)));
    }

    public function show(Request $request, int $product): JsonResponse
    {
        return response()->json($this->queries->ask(new GetProduct($product, $request->company()->id)));
    }

    public function store(StoreProductRequest $request): JsonResponse
    {
        $companyId = $request->company()->id;

        $productId = $this->commands->dispatch(new CreateProduct(
            companyId: $companyId,
            name: $request->validated('name'),
            categoryId: $request->validated('category_id'),
            sellPrice: $request->validated('sell_price'),
            costPrice: $request->validated('cost_price'),
            tracksStock: $request->boolean('tracks_stock'),
            stockQuantity: (int) ($request->validated('stock_quantity') ?? 0),
            lowStockThreshold: $request->validated('low_stock_threshold'),
        ));

        return response()->json($this->queries->ask(new GetProduct($productId, $companyId)), 201);
    }

    /**
     * Only the fields actually sent are changed. stock_quantity isn't accepted: after creation it
     * moves only through restock, adjust-stock or a sale, each of which leaves a stock movement.
     */
    public function update(UpdateProductRequest $request, int $product): JsonResponse
    {
        $companyId = $request->company()->id;
        $fields = [
            'name' => 'name',
            'category_id' => 'categoryId',
            'sell_price' => 'sellPrice',
            'cost_price' => 'costPrice',
            'tracks_stock' => 'tracksStock',
            'low_stock_threshold' => 'lowStockThreshold',
        ];

        $changes = [];
        foreach ($request->validated() as $key => $value) {
            if (isset($fields[$key])) {
                $changes[$fields[$key]] = $value;
            }
        }

        $this->commands->dispatch(new UpdateProduct($product, $companyId, $changes));

        return response()->json($this->queries->ask(new GetProduct($product, $companyId)));
    }

    public function destroy(Request $request, int $product): JsonResponse
    {
        $this->commands->dispatch(new DeleteProduct($product, $request->company()->id));

        return response()->json(null, 204);
    }

    /** Adds stock at a unit cost; by default also logs the purchase as an expense. */
    public function restock(RestockProductRequest $request, int $product): JsonResponse
    {
        $companyId = $request->company()->id;

        $outcome = $this->commands->dispatch(new RestockProduct(
            productId: $product,
            companyId: $companyId,
            quantity: $request->validated('quantity'),
            unitCost: $request->validated('unit_cost'),
            note: $request->validated('note'),
            recordExpense: $request->boolean('create_expense', true),
        ));

        return response()->json([
            'product' => $this->queries->ask(new GetProduct($product, $companyId)),
            'movement' => $this->queries->ask(new GetStockMovement($outcome->movementId)),
            // Bookkeeping isn't a bounded context yet, so its row is read through the legacy model.
            'transaction' => $outcome->expenseTransactionId ? Transaction::find($outcome->expenseTransactionId) : null,
        ], 201);
    }

    /** A manual correction — loss, breakage, recount. */
    public function adjustStock(AdjustStockRequest $request, int $product): JsonResponse
    {
        $companyId = $request->company()->id;

        $movementId = $this->commands->dispatch(new AdjustProductStock(
            productId: $product,
            companyId: $companyId,
            quantityChange: $request->validated('quantity_change'),
            note: $request->validated('note'),
        ));

        return response()->json([
            'product' => $this->queries->ask(new GetProduct($product, $companyId)),
            'movement' => $this->queries->ask(new GetStockMovement($movementId)),
        ], 201);
    }

    public function movements(Request $request, int $product): JsonResponse
    {
        return response()->json($this->queries->ask(new ListStockMovements($product, $request->company()->id)));
    }
}
