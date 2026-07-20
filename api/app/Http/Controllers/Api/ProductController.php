<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Product\StoreProductRequest;
use App\Http\Requests\Product\UpdateProductRequest;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * GET /products — the authenticated user's product/service catalog.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->products()->latest()->get());
    }

    /**
     * POST /products — add an item to the catalog (e.g. a drink, a dish, a service).
     */
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = $request->user()->products()->create($request->validated());

        return response()->json($product, 201);
    }

    /**
     * PUT /products/{product} — edit a catalog item.
     */
    public function update(UpdateProductRequest $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $product->update($request->validated());

        return response()->json($product);
    }

    /**
     * DELETE /products/{product} — remove a catalog item.
     */
    public function destroy(Request $request, Product $product): JsonResponse
    {
        abort_unless($product->user_id === $request->user()->id, 403);

        $product->delete();

        return response()->json(null, 204);
    }
}
