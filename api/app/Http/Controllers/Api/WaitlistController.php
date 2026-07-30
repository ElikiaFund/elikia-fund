<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWaitlistEntryRequest;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;

class WaitlistController extends Controller
{
    /**
     * POST /waitlist — public, unauthenticated (called from the marketing website, which has no
     * logged-in user). Idempotent on email so re-submitting the same address never errors.
     */
    public function store(StoreWaitlistEntryRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $entry = WaitlistEntry::firstOrCreate(
            ['email' => $validated['email']],
            ['name' => $validated['name'] ?? null],
        );

        if (! $entry->wasRecentlyCreated && ! $entry->name && ! empty($validated['name'])) {
            $entry->update(['name' => $validated['name']]);
        }

        return response()->json(['message' => 'Vous êtes sur la liste d\'attente.'], 201);
    }
}
