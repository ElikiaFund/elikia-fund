<?php

namespace App\Http\Controllers\Api;

use App\Domains\Catalog\Application\Category\CreateProductCategory;
use App\Domains\Catalog\Application\Category\DeleteProductCategory;
use App\Domains\Catalog\Application\Category\GetProductCategory;
use App\Domains\Catalog\Application\Category\ListProductCategories;
use App\Domains\Catalog\Application\Category\UpdateProductCategory;
use App\Domains\Shared\Application\Bus\CommandBus;
use App\Domains\Shared\Application\Bus\QueryBus;
use App\Http\Controllers\Controller;
use App\Http\Requests\ProductCategory\StoreProductCategoryRequest;
use App\Http\Requests\ProductCategory\UpdateProductCategoryRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductCategoryController extends Controller
{
    public function __construct(
        private readonly CommandBus $commands,
        private readonly QueryBus $queries,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->queries->ask(new ListProductCategories($request->company()->id)));
    }

    public function store(StoreProductCategoryRequest $request): JsonResponse
    {
        $companyId = $request->company()->id;

        $categoryId = $this->commands->dispatch(new CreateProductCategory(
            companyId: $companyId,
            name: $request->validated('name'),
            icon: $request->validated('icon'),
            color: $request->validated('color'),
        ));

        return response()->json($this->queries->ask(new GetProductCategory($categoryId, $companyId)), 201);
    }

    public function update(UpdateProductCategoryRequest $request, int $productCategory): JsonResponse
    {
        $companyId = $request->company()->id;
        $changes = array_intersect_key($request->validated(), array_flip(UpdateProductCategory::FIELDS));

        $this->commands->dispatch(new UpdateProductCategory($productCategory, $companyId, $changes));

        return response()->json($this->queries->ask(new GetProductCategory($productCategory, $companyId)));
    }

    /** Products in the category are kept, uncategorized. */
    public function destroy(Request $request, int $productCategory): JsonResponse
    {
        $this->commands->dispatch(new DeleteProductCategory($productCategory, $request->company()->id));

        return response()->json(null, 204);
    }
}
