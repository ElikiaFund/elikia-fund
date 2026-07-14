<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateScoringCriterionRequest;
use App\Models\ScoringCriterion;
use Illuminate\Http\JsonResponse;

class ScoringCriterionController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(ScoringCriterion::orderBy('id')->get());
    }

    /**
     * Only weight/is_active/thresholds are editable — `key`/`label`/`description` are
     * code-defined (ScoringCriteriaSeeder), the factor catalog itself is fixed.
     */
    public function update(UpdateScoringCriterionRequest $request, ScoringCriterion $scoringCriterion): JsonResponse
    {
        $scoringCriterion->update($request->validated());

        return response()->json($scoringCriterion);
    }
}
