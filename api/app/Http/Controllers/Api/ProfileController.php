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
}
