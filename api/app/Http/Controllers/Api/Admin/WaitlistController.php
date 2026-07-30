<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaitlistEntry;
use Illuminate\Http\JsonResponse;

class WaitlistController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(WaitlistEntry::latest()->get());
    }

    public function destroy(WaitlistEntry $waitlistEntry): JsonResponse
    {
        $waitlistEntry->delete();

        return response()->json(['message' => 'Inscription supprimée.']);
    }
}
