<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreCompanyRequest;
use App\Models\ProductCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    /**
     * GET /companies — every company the authenticated user owns, for the mobile switcher.
     */
    public function index(Request $request): JsonResponse
    {
        return response()->json($request->user()->companies()->latest()->get());
    }

    /**
     * POST /companies — creates a company for the authenticated user. Used both for first-time
     * onboarding and for adding a 2nd+ company later via the switcher — the only difference is
     * onboarding_completed_at only gets set the first time.
     */
    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $user = $request->user();

        $company = $user->companies()->create($request->validated());

        ProductCategory::seedDefaultsFor($company);

        if (! $user->onboarding_completed_at) {
            $user->forceFill(['onboarding_completed_at' => now()])->save();
        }

        return response()->json($company, 201);
    }
}
