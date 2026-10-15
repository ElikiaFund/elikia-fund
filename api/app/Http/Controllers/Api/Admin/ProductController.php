<?php

namespace App\Http\Controllers\Api\Admin;

use App\Domains\Catalog\Application\Product\DeleteProduct;
use App\Domains\Shared\Application\Bus\CommandBus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    public function __construct(private readonly CommandBus $commands) {}

    /**
     * Read access is bundled into CompanyController@show's eager load (the "Produits" tab on the
     * company-detail page) — this controller only adds the delete action.
     */
    public function destroy(int $product): JsonResponse
    {
        $this->commands->dispatch(new DeleteProduct($product, companyId: null));

        return response()->json(['message' => 'Produit supprimé.']);
    }
}
