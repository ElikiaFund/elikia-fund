<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;
use Throwable;

class SocialAuthService
{
    /**
     * Verify a Google Sign-In ID token and return the user's profile.
     */
    public function verifyGoogleToken(string $idToken): array
    {
        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Jeton Google invalide.');
        }

        $payload = $response->json();

        $expectedClientId = config('services.google.client_id');

        if ($expectedClientId && ($payload['aud'] ?? null) !== $expectedClientId) {
            // Not sensitive — a Google OAuth client id is a public identifier, not a secret — but
            // logs the exact mismatch so a "the .env looks right" report can be root-caused from
            // the server's own logs instead of guessing (this env's GOOGLE_CLIENT_ID vs. the
            // audience the mobile app's token was actually issued for).
            Log::warning('Google Sign-In token audience mismatch', [
                'expected_client_id' => $expectedClientId,
                'actual_aud' => $payload['aud'] ?? null,
            ]);

            throw new RuntimeException("Ce jeton Google n'a pas été émis pour cette application.");
        }

        return [
            'provider_id' => $payload['sub'],
            'email' => $payload['email'] ?? null,
            'name' => $payload['name'] ?? null,
            'avatar_url' => $payload['picture'] ?? null,
        ];
    }

    /**
     * Verify a Facebook Login access token and return the user's profile.
     */
    public function verifyFacebookToken(string $accessToken): array
    {
        $this->assertFacebookTokenBelongsToThisApp($accessToken);

        $response = Http::get('https://graph.facebook.com/me', [
            'fields' => 'id,name,email,picture',
            'access_token' => $accessToken,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Jeton Facebook invalide.');
        }

        $payload = $response->json();

        return [
            'provider_id' => $payload['id'],
            'email' => $payload['email'] ?? null,
            'name' => $payload['name'] ?? null,
            'avatar_url' => $payload['picture']['data']['url'] ?? null,
        ];
    }

    /**
     * Guard against token substitution: verify the access token was issued to THIS
     * app (not a valid Facebook token for some other app) before trusting it, via
     * Facebook's debug_token endpoint.
     */
    private function assertFacebookTokenBelongsToThisApp(string $accessToken): void
    {
        $appId = config('services.facebook.app_id');
        $appSecret = config('services.facebook.app_secret');

        $response = Http::get('https://graph.facebook.com/debug_token', [
            'input_token' => $accessToken,
            'access_token' => "{$appId}|{$appSecret}",
        ]);

        $data = $response->json('data');

        if ($response->failed() || ! ($data['is_valid'] ?? false) || ($data['app_id'] ?? null) !== $appId) {
            throw new RuntimeException('Jeton Facebook invalide.');
        }
    }

    /**
     * Verify a Sign in with Apple identity token against Apple's published JWKS
     * (https://appleid.apple.com/auth/keys) and return the user's profile. JWT::decode() verifies
     * the RS256 signature and standard exp/nbf/iat claims; iss/aud are checked explicitly below,
     * mirroring verifyGoogleToken()'s aud check.
     */
    public function decodeAppleToken(string $identityToken): array
    {
        try {
            $payload = (array) JWT::decode($identityToken, JWK::parseKeySet($this->appleKeys()));
        } catch (Throwable) {
            // A cached key set can go stale if Apple rotates keys between our fetches — one retry
            // against a freshly-fetched set covers that before giving up for real.
            try {
                $payload = (array) JWT::decode($identityToken, JWK::parseKeySet($this->appleKeys(fresh: true)));
            } catch (Throwable $e) {
                Log::warning('Apple Sign-In token verification failed', ['message' => $e->getMessage()]);

                throw new RuntimeException('Jeton Apple invalide.');
            }
        }

        if (($payload['iss'] ?? null) !== 'https://appleid.apple.com') {
            throw new RuntimeException('Jeton Apple invalide.');
        }

        $expectedClientId = config('services.apple.client_id');

        if ($expectedClientId && ($payload['aud'] ?? null) !== $expectedClientId) {
            throw new RuntimeException("Ce jeton Apple n'a pas été émis pour cette application.");
        }

        if (! isset($payload['sub'])) {
            throw new RuntimeException('Jeton Apple invalide.');
        }

        return [
            'provider_id' => $payload['sub'],
            'email' => $payload['email'] ?? null,
            // Apple only sends the user's full name once, on the client, on first sign-in — never
            // inside the token itself — so this is always null here; AuthController fills it in
            // from the request when the client provides it (see AppleLoginRequest, User::needsName()).
            'name' => null,
            'avatar_url' => null,
        ];
    }

    /**
     * Apple's public signing keys — cached, since they rotate infrequently but not never (see the
     * fresh-retry in decodeAppleToken() above for when the cached set no longer has the key a
     * token was actually signed with).
     *
     * @return array{keys: array<int, array<string, string>>}
     */
    private function appleKeys(bool $fresh = false): array
    {
        if ($fresh) {
            Cache::forget('apple_sign_in_jwks');
        }

        return Cache::remember('apple_sign_in_jwks', now()->addHours(6), function () {
            $response = Http::get('https://appleid.apple.com/auth/keys');

            if ($response->failed()) {
                throw new RuntimeException('Impossible de vérifier le jeton Apple pour le moment.');
            }

            return $response->json();
        });
    }
}
