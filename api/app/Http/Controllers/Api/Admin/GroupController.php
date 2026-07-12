<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Group;
use Illuminate\Http\JsonResponse;

class GroupController extends Controller
{
    public function index(): JsonResponse
    {
        // `contributions` is eager-loaded (not just summed) so the back-office dashboard can
        // aggregate/date-filter cotisations client-side without a dedicated endpoint.
        return response()->json(
            Group::with('owner', 'contributions')
                ->withCount('members')
                ->withSum('contributions', 'amount')
                ->latest()
                ->get()
        );
    }

    public function show(Group $group): JsonResponse
    {
        return response()->json(
            $group->load('owner', 'members', 'contributions.user')->loadCount('members')->loadSum('contributions', 'amount')
        );
    }

    public function destroy(Group $group): JsonResponse
    {
        $group->delete();

        return response()->json(['message' => 'Groupe supprimé.']);
    }
}
