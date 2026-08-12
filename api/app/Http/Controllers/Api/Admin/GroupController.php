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
            Group::with('owner', 'company', 'contributions')
                ->withCount('members')
                ->withSum('contributions', 'amount')
                ->latest()
                ->get()
        );
    }

    public function show(Group $group): JsonResponse
    {
        // Every relation must live in the one array passed to load() — mixing plain relation-name
        // strings with a closure-constrained entry across separate positional arguments throws
        // ("Method name must be a string") deep in Eloquent's eager-load resolution.
        return response()->json(
            $group->load([
                'owner',
                'company',
                'members',
                'removedMembers',
                'contributions.user',
                'cycleRecipients' => fn ($query) => $query->whereNotNull('paid_out_at')->with('user', 'vaultMovement'),
                'pendingDeletionRequest.votes.user',
                'pendingDeletionRequest.requester',
            ])->loadCount('members')->loadSum('contributions', 'amount')
        );
    }

    public function destroy(Group $group): JsonResponse
    {
        $group->delete();

        return response()->json(['message' => 'Groupe supprimé.']);
    }
}
