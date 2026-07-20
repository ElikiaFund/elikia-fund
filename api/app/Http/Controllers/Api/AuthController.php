<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AppleLoginRequest;
use App\Http\Requests\Auth\FacebookLoginRequest;
use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use App\Services\SocialAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class AuthController extends Controller
{
    public function __construct(private readonly SocialAuthService $socialAuth) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'phone' => $validated['phone'],
            'password' => $validated['password'], // 'hashed' cast on the model hashes this on write.
        ]);

        return $this->tokenResponse($user);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $user = User::where('phone', $validated['phone'])->first();

        if (! $user || ! $user->password || ! Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }

        return $this->tokenResponse($user);
    }

    public function google(GoogleLoginRequest $request): JsonResponse
    {
        try {
            $profile = $this->socialAuth->verifyGoogleToken($request->validated('id_token'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->tokenResponse($this->findOrCreateUser('google_id', $profile));
    }

    public function apple(AppleLoginRequest $request): JsonResponse
    {
        try {
            $profile = $this->socialAuth->decodeAppleToken($request->validated('identity_token'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        if ($request->filled('name')) {
            $profile['name'] = $request->validated('name');
        }

        return $this->tokenResponse($this->findOrCreateUser('apple_id', $profile));
    }

    public function facebook(FacebookLoginRequest $request): JsonResponse
    {
        try {
            $profile = $this->socialAuth->verifyFacebookToken($request->validated('access_token'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return $this->tokenResponse($this->findOrCreateUser('facebook_id', $profile));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user()->load('company', 'role'));
    }

    /**
     * Find the user by their provider id, fall back to matching by email
     * (linking the provider to an existing account), or create a new one.
     */
    private function findOrCreateUser(string $providerColumn, array $profile): User
    {
        $user = User::where($providerColumn, $profile['provider_id'])->first();

        if ($user) {
            return $user;
        }

        if (! empty($profile['email'])) {
            $user = User::where('email', $profile['email'])->first();
        }

        if ($user) {
            $user->update([$providerColumn => $profile['provider_id']]);

            return $user;
        }

        return User::create([
            'name' => $profile['name'] ?? 'Utilisateur Elikia',
            'email' => $profile['email'] ?? "{$profile['provider_id']}@{$providerColumn}.elikia-fund.placeholder",
            'avatar_url' => $profile['avatar_url'] ?? null,
            $providerColumn => $profile['provider_id'],
        ]);
    }

    private function tokenResponse(User $user): JsonResponse
    {
        return response()->json([
            'user' => $user->load('company'),
            'token' => $user->createToken('mobile')->plainTextToken,
        ]);
    }
}
