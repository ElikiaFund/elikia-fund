<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

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
     * Decode a Sign in with Apple identity token and return the user's profile.
     *
     * NOTE: this only decodes the JWT payload — it does NOT verify the signature.
     * Before production, verify against Apple's published JWKS
     * (https://appleid.apple.com/auth/keys), e.g. via firebase/php-jwt, and check
     * that `aud` matches your Services ID and `iss` is https://appleid.apple.com.
     */
    public function decodeAppleToken(string $identityToken): array
    {
        $parts = explode('.', $identityToken);

        if (count($parts) !== 3) {
            throw new RuntimeException('Jeton Apple invalide.');
        }

        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

        if (! is_array($payload) || ! isset($payload['sub'])) {
            throw new RuntimeException('Jeton Apple invalide.');
        }

        return [
            'provider_id' => $payload['sub'],
            'email' => $payload['email'] ?? null,
            // Apple only sends the user's full name once, on the client, on first sign-in — not in the token.
            'name' => null,
            'avatar_url' => null,
        ];
    }
}
