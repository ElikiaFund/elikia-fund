<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\InsufficientStockException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Product\AdjustStockRequest;
use App\Http\Requests\Product\RestockProductRequest;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use App\Services\ProductStockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private readonly ProductStockService $stock) {}

    /**
     * GET /products — the authenticated user's product/service catalog.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->products()->with('category')->latest()->get());
    }

    /**
     * GET /products/{product} — single item, for the detail/edit screen.
     */
    public function show(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        return response()->json($product->load('category'));
    }

    /**
     * POST /products — add an item to the catalog (e.g. a drink, a dish, a service).
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $request->user()->products()->create($request->validated());

        if ($product->tracks_stock && $product->stock_quantity > 0) {
            $this->stock->recordInitialStock($product);
        }

        return response()->json($product, 201);
    }

    /**
     * PUT /products/{product} — edit a catalog item. stock_quantity is deliberately not accepted
     * here — post-creation it can only change via restock/adjust-stock/a sale, each of which
     * leaves an audit trail in stock_movements.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $product->update($request->validated());

        return response()->json($product);
    }

    /**
     * DELETE /products/{product} — remove a catalog item. Cascades to stock_movements.
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $product->delete();

        return response()->json(null, 204);
    }

    /**
     * POST /products/{product}/restock — add stock at a given unit cost, recomputing the
     * product's weighted-average cost_price, optionally logging a matching expense transaction.
     */
    public function restock(RestockProductRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        if (! $product->tracks_stock) {
            return response()->json(['message' => 'Ce produit ne suit pas de stock.'], 422);
        }

        $result = $this->stock->restock(
            $product,
            $request->validated('quantity'),
            $request->validated('unit_cost'),
            $request->validated('note'),
            $request->boolean('create_expense', true),
        );

        return response()->json($result, 201);
    }

    /**
     * POST /products/{product}/adjust-stock — a manual correction (loss, breakage, recount).
     */
    public function adjustStock(AdjustStockRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        if (! $product->tracks_stock) {
            return response()->json(['message' => 'Ce produit ne suit pas de stock.'], 422);
        }

        try {
            $movement = $this->stock->adjust($product, $request->validated('quantity_change'), $request->validated('note'));
        } catch (InsufficientStockException) {
            return response()->json(['message' => 'Stock insuffisant pour ce produit.'], 422);
        }

        return response()->json(['product' => $product->fresh(), 'movement' => $movement], 201);
    }

    /**
     * GET /products/{product}/movements — full stock movement history, most recent first.
     */
    public function movements(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        return response()->json($product->stockMovements()->latest()->get());
    }
}
