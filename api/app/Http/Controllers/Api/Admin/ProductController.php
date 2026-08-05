<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\JsonResponse;

class ProductController extends Controller
{
    /**
     * Read access is bundled into CompanyController@show's eager load (the "Produits" tab on the
     * company-detail page) — this controller only adds the delete action that didn't exist yet.
     */
    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Produit supprimé.']);
    }
}
