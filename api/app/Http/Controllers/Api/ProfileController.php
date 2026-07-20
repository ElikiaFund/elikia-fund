<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($request->filled('password')) {
            if (! $user->password || ! Hash::check($request->string('current_password'), $user->password)) {
                return response()->json(['message' => 'Mot de passe actuel incorrect.'], 422);
            }

            $user->password = $request->validated('password');
        }

        $user->name = $request->validated('name');
        $user->email = $request->validated('email');
        $user->save();

        return response()->json($user->load('company', 'role'));
    }

    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'max:2048'],
        ]);

        $user = $request->user();
        $path = $request->file('avatar')->store('avatars', 'public');

        $user->forceFill(['avatar_url' => asset('storage/'.$path)])->save();

        return response()->json($user);
    }

    /**
     * POST /me/push-token — register/refresh this device's Expo push token. Called on login and
     * app start; overwrites any previous token (single-device model, same simplicity tradeoff as
     * the rest of this codebase — see CLAUDE.md's "keep it dumb" conflict rule for cash flow sync).
     */
    public function registerPushToken(Request $request): JsonResponse
    {
        $request->validate([
            'push_token' => ['required', 'string', 'max:255'],
        ]);

        $request->user()->forceFill(['push_token' => $request->string('push_token')])->save();

        return response()->json(['message' => 'Jeton de notification enregistré.']);
    }
}
