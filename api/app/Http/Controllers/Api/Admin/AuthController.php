<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AdminLoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
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
}
