<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AdminLoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(AdminLoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($validated['password'], $user->password) || ! $user->is_admin) {
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

        return response()->json([
            'user' => $user,
            'token' => $user->createToken('back-office')->plainTextToken,
        ]);
    }

    /**
     * POST /admin/verify-password — step 2 of the back-office's destructive-action confirmation
     * flow (type the record's identifier, then re-enter your password).
     */
    public function verifyPassword(Request $request): JsonResponse
    {
        $request->validate(['password' => ['required', 'string']]);

        if (! $request->user()->password || ! Hash::check($request->string('password'), $request->user()->password)) {
            return response()->json(['message' => 'Mot de passe incorrect.'], 422);
        }

        return response()->json(['message' => 'Mot de passe vérifié.']);
    }
}
