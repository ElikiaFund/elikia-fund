<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use Illuminate\Http\JsonResponse;

class CompanyController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(Company::with('user')->latest()->get());
    }

    public function show(Company $company): JsonResponse
    {
        return response()->json($company->load('user'));
    }

    public function destroy(Company $company): JsonResponse
    {
        $company->delete();

        return response()->json(['message' => 'Entreprise supprimée.']);
    }
}
