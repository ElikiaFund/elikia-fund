<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CashSession;
use Illuminate\Http\JsonResponse;

class CashSessionController extends Controller
{
    /**
     * Read access is bundled into CompanyController@show's eager load (the "Sessions de caisse"
     * tab on the company-detail page) — this controller only adds the delete action that didn't
     * exist yet.
     */
    public function destroy(CashSession $cashSession): JsonResponse
    {
        $cashSession->delete();

        return response()->json(['message' => 'Session de caisse supprimée.']);
    }
}
