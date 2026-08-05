<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductCategory\StoreProductCategoryRequest;
use App\Http\Requests\ProductCategory\UpdateProductCategoryRequest;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    /**
     * GET /product-categories — the active company's own product categories.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->company()->productCategories()->orderBy('name')->get());
    }

    /**
     * POST /product-categories — create a category (e.g. "Boissons").
     */
    public function store(StoreProductCategoryRequest $request): JsonResponse
    {
        $category = $request->company()->productCategories()->create($request->validated());

        return response()->json($category, 201);
    }

    /**
     * PUT /product-categories/{productCategory} — rename/restyle a category.
     */
    public function update(UpdateProductCategoryRequest $request, ProductCategory $productCategory): JsonResponse
    {
        abort_unless($productCategory->company_id === $request->company()->id, 403);

        $productCategory->update($request->validated());

        return response()->json($productCategory);
    }

    /**
     * DELETE /product-categories/{productCategory} — products referencing this category are
     * uncategorized (nullOnDelete), not deleted.
     */
    public function destroy(Request $request, ProductCategory $productCategory): JsonResponse
    {
        abort_unless($productCategory->company_id === $request->company()->id, 403);

        $productCategory->delete();

        return response()->json(null, 204);
    }
}
