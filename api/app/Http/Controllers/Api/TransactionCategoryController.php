<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionCategory\StoreTransactionCategoryRequest;
use App\Http\Requests\TransactionCategory\UpdateTransactionCategoryRequest;
use App\Models\TransactionCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TransactionCategoryController extends Controller
{
    /**
     * GET /transaction-categories — the active company's own cash flow categories, optionally
     * filtered to one type (?type=income|expense) for the mobile add-transaction form.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['type' => ['sometimes', 'string', Rule::in(['income', 'expense'])]]);

        $query = $request->company()->transactionCategories()->orderBy('name');

        if ($request->filled('type')) {
            $query->where('type', $request->string('type'));
        }

        return response()->json($query->get());
    }

    /**
     * POST /transaction-categories — create a category (e.g. "Vente", "Alimentation").
     */
    public function store(StoreTransactionCategoryRequest $request): JsonResponse
    {
        $category = $request->company()->transactionCategories()->create($request->validated());

        return response()->json($category, 201);
    }

    /**
     * PUT /transaction-categories/{transactionCategory} — rename/restyle a category.
     */
    public function update(UpdateTransactionCategoryRequest $request, TransactionCategory $transactionCategory): JsonResponse
    {
        abort_unless($transactionCategory->company_id === $request->company()->id, 403);

        $transactionCategory->update($request->validated());

        return response()->json($transactionCategory);
    }

    /**
     * DELETE /transaction-categories/{transactionCategory} — existing transactions keep their
     * category as plain text (Transaction::category is a free string, not a foreign key), so
     * deleting a category never touches past entries, only removes it from future pickers.
     */
    public function destroy(Request $request, TransactionCategory $transactionCategory): JsonResponse
    {
        abort_unless($transactionCategory->company_id === $request->company()->id, 403);

        $transactionCategory->delete();

        return response()->json(null, 204);
    }
}
