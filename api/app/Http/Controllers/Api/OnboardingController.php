<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Onboarding\CreateCompanyRequest;
use Illuminate\Http\JsonResponse;

class OnboardingController extends Controller
{
    /**
     * POST /onboarding/company — first-time setup: creates the user's company profile.
     */
    public function createCompany(CreateCompanyRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->company()->exists()) {
            return response()->json(['message' => 'Une entreprise est déjà configurée.'], 409);
        }

        $company = $user->company()->create($request->validated());

        $user->forceFill(['onboarding_completed_at' => now()])->save();

        return response()->json($company, 201);
    }
}
