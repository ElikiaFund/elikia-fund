<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\VaultSecurityEvent;
use Illuminate\Http\JsonResponse;

class VaultSecurityEventController extends Controller
{
    /**
     * GET /admin/users/{user}/vault-security-events
     */
    public function __invoke(User $user): JsonResponse
    {
        return response()->json(
            VaultSecurityEvent::where('user_id', $user->id)->with('vaultMovement')->latest()->get()
        );
    }
}
