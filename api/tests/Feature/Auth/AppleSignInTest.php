<?php

namespace Tests\Feature\Auth;

use App\Services\SocialAuthService;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Tests\TestCase;

/**
 * Exercises the real RS256 verification path against a genuinely signed token (not just "does it
 * decode a base64 payload") — a throwaway, test-only 2048-bit RSA key pair stands in for Apple's,
 * with its public half served back from a faked https://appleid.apple.com/auth/keys response,
 * exactly the shape SocialAuthService::appleKeys() expects.
 *
 * The key pair is hardcoded (not generated via openssl_pkey_new() at runtime) because this repo's
 * local PHP/OpenSSL setup has no openssl.cnf configured, which openssl_pkey_new() needs but
 * openssl_pkey_get_details() on an already-generated key doesn't — a Windows/WAMP environment
 * quirk, not something worth working around for a test fixture. Never used for anything but this test.
 */
class AppleSignInTest extends TestCase
{
    private const KID = 'test-key-1';

    private const PRIVATE_KEY_PEM = <<<'PEM'
    -----BEGIN RSA PRIVATE KEY-----
    MIIEogIBAAKCAQEAlzpM3n6wdcY+hVoxbWBwc/2oyL9QGJNjtJ4CW80nWLbvOUZ/
    U0Zqv38pwLgzkTgFN64xlzma+CJUf3pkc7a8MA+TM3UGzK2+ylGJirug9+tnug5j
    GN5Vuwt+DuIKvB5zIWxY4tHCD4CfVGF3MKOxon7LDJLJ5AEAWkThx+T+nmab7hOK
    5sEMtlq3+90aUd8R27Xna9m+GIwQeeQcdhvshXj83T5KNk+Fm6jeUXfZxEPAv8k1
    W1As7BSyQfxk5yb4pKEMBs+2CblQ+NIQItOQ7mGtH0c5I8QmXPUJscCRGj1LrB9I
    JgBg7MMRIgp5lJljKiUvVr9xDdjderPuZvCuiQIDAQABAoIBACInT478S7v9jsct
    LHaITj1T71ePJXa3atAy01OKTLWTcwmba0wSXi9rd7GHqFXGsh72H0sI/n/FuRGl
    QaSEg5HTIqp/Zo65OpqUuZx0bZEwQBfcAfNu2yvIF6siz8vWkKfewWBQgSRhJxq2
    fGWmwopxWkg3qpLsyviYD+nGRN7e8ryvLAvgBAyobrgbK6gvygMG92oOsqSRh5/E
    xeQtWINXDLJQeJz1m28RBEAX0IDBjGBRY4ILVf7SV+rKGkn0ULViQi+KR3gh+4om
    eMNcow2PO5f20gqRXzn9IE0I55D2TCt02V6OHudrnBkuvDVEyN8js1mLhNFBUlPJ
    Fg5mu9ECgYEAx0Rto+JoKnRuGSn/mk9QlVt22DCeBiMb2xoXkyUbvA/NPYuTNgEJ
    V5gD38i4RnMlkhaPfbpHYHgPFOx8v73L+P4S2MX8Xu/Y/oGy4PJVRmcOVHPlKnw9
    B7p4vp+UE200X091ZuKdiQxxM74oVxBdErMWak71RgqzzqECw9lXxvUCgYEAwkiD
    utvxPykhb62zcKCnHNJrrQYHSCtUfyvwNPbMHbLjsx5zmB5EN+45X03amVflp/7l
    shqlahZf9O/DL2iUZJ0CMgvFMRyVfMlhyxCk7Gq/VzsAv8b/5u9X6hsqCrGNLzup
    iXp3Pqhke9f15cXA4v/Kfk1kQMHmv025gXUtxMUCgYAWWEkHKJtPr3CtJ7V+40gB
    B5mjEoiV3ZgBEML2ACJFC2yTazRdyO34QZaloIdxdvYOlLMQgTQB0FS4nvA6PBlE
    WZFZd5IePz0RBRA/A02msGW9+KUJB5d8Z1+k2JYtO4C0818R43WQ6bFEAR3a7X3S
    W/y2fRYp/Yc+M3Xw6k1ahQKBgAI9u+dH6jyESPJ02oEOGV9nvf4895CJj2v4Ick6
    n5goHCBQ1ZyHnNnYUakbyM3ECc4qTpQDYq0anPjCW0oMtsmCViglopyya7cIy6wA
    AScJBDQJZjTQItuTHzyAG7gL3EkTMx124DFE2APltdx0r4ju0nMqiWGF2xeR2fX4
    WBLRAoGAUcnJm+EltgLio/uZAIhQDbo2KpzRZ2gTwWJEV7YGgEMLoLPCU1SVvCUk
    KoJyNeHANpk5QDvVl5wUNFKBYxPx2sH9C2DUPX3BdDz35tl1+Gi0FiHxi4GEmcEb
    RNTDy/ZXl3TIR+w0O6o9wS+7eLbjd/vDlD1z9gQb9eqMmoQKZE8=
    -----END RSA PRIVATE KEY-----
    PEM;

    /** A completely different key pair — never published in the faked JWKS response — used to
     * prove a token signed by an untrusted key is rejected even with a matching `kid`. */
    private const OTHER_PRIVATE_KEY_PEM = <<<'PEM'
    -----BEGIN RSA PRIVATE KEY-----
    MIIEpgIBAAKCAQEAsm21jaQrFVhxaXdCroyBFYF7UXX7mC0G5GggXjBNbqVOv0Re
    YiCS2YtEwiItMNstowguQLcSWArpmpkTpaQ3W6vNw9ekidODVSIPRFMNDDY5nTQ5
    mMpPnQuPi/pyOvd6tJx6QykbZ2mmW4BCf/OwqpRi8M+PGxmipUV20P2HYCXoxcgC
    MQTLFOD3khdWsMzzHCM7cu6Rxnz5cR9dCua4XmPOXLIYhtW+fJz7G9RZp/0ZF4y3
    RO5N30Kl2suJUrd2em+hLPsNNjEBOh+EaHKZvrELKsFcSsyXmoTlyUBZEiPcFSr4
    OfLst2AY449hkqWulEqFLdPF/JbGT4k88G4VoQIDAQABAoIBAQCwlo2xYgHVvVN5
    GrQfBiWXAC/pHkhjgmSo1zj5nvpzgB1ghKyYlz5fGUtyitqI2NLg4G7OU6FPC3XJ
    MKjWLaEwE+ewZJKOaYw4TF4ps7xdEqmQoShDxC5o8hEeaz50h4ukhp0mLN/XSCOB
    uX2XHroBCJynUfSC0Ks8wHPoQJKjnxogAN30hcuWFuoLS202pT3lXWbBNRnPy7X4
    JEqLTPS3zJaSPRsBjzGn6AmiQblFwdTPd/TMzs0OJRHirdwUVFfmagdXxZFbvyTU
    +oOhfk7GnAbcCnPPGaroo6vjKtDJtfGZVKRVIa1GTsi5Aw95/qEbu9N7eCTi8zg3
    0Oj26cHBAoGBANgXcwgVXa/IahmPVQWJbDpFps5w24Xivzvr0R2FmXpOV1LDYP0A
    yV9fSKoovX41uaxfsRN5fjSAONm/5w+C0nMCn4KI8UIhoLyRHZmJW4NoeW8rM0Q+
    gnBkweSRh16TdXb6NnLLpndVYuFOvEWHln7RTf6E7UpUYLMH5prrT4e5AoGBANNh
    mKeYtBRlYQ9gt5ZaxMUYMmOs239nbG1bFKb4em4xMpSuoJ7u35DCICTYgWfbAHyn
    k/J+Lcmp7SF9RyU3pywuZ6JinF5tw/dlKKxzf3VDmLWN3weaYFGlWKQ9ux4uP5We
    mWN5/0uEnne5Jx0MqEtcZRYj7Dt12S0p2PZ+BqEpAoGBALHYytHSU+MCvV//+Wev
    LKXhAWJSvDm63s1ATkFP3Xst0uzI5KAV76ZQ04tIMH0ZVpEpyKFQkrA+/4snR9Ia
    R35koEdc0cMtzg6kGIpu5CSI7bizA2SdVdmO841cwN7z2e9sCzf7qCv62IC6vnUz
    HIePV/OsD2fnfhaa4A6MsE3xAoGBAMAZlujgzu8mPvIBvHZI4UAZQFnzUrtTG2e6
    eWdQs7sGvOgAV3p4rfZZZWr204u1rJiclsiuwR/fbOCdgJWjISr2tToPEfqDGK/x
    X+hxQmkoWFTOrNy1AEnS0V7Ztv6zmxd3PgD4cvmHeZhmTNSKlzt9qWRYmyxiak8w
    E7vXRmEZAoGBAIbxHQMaE8HIyIDg/SZySmZsnuqHTtzYI1LcxZ6nWVfVeI8NaGSA
    H0NskUa29saVYTsNWpt2aZBkzr392wPtKmpU/195XMcKFlQNQppT5jSl9aN/oDre
    y6B61CPi72rKuIowjMkYcWADpey+uY2DBdVy+qGQHQk+zpo0t4T76JiD
    -----END RSA PRIVATE KEY-----
    PEM;

    protected function setUp(): void
    {
        parent::setUp();

        $details = openssl_pkey_get_details(openssl_pkey_get_private(self::PRIVATE_KEY_PEM));

        Http::fake([
            'https://appleid.apple.com/auth/keys' => Http::response(['keys' => [[
                'kty' => 'RSA',
                'kid' => self::KID,
                'use' => 'sig',
                'alg' => 'RS256',
                'n' => rtrim(strtr(base64_encode($details['rsa']['n']), '+/', '-_'), '='),
                'e' => rtrim(strtr(base64_encode($details['rsa']['e']), '+/', '-_'), '='),
            ]]]),
        ]);
    }

    private function makeToken(array $overrides = [], ?string $signingKey = null): string
    {
        $payload = array_merge([
            'iss' => 'https://appleid.apple.com',
            'aud' => 'com.elikiafund.mobile',
            'sub' => 'apple-user-123',
            'email' => 'user@example.com',
            'iat' => time(),
            'exp' => time() + 3600,
        ], $overrides);

        return JWT::encode($payload, $signingKey ?? self::PRIVATE_KEY_PEM, 'RS256', self::KID);
    }

    public function test_a_validly_signed_token_is_accepted(): void
    {
        config(['services.apple.client_id' => 'com.elikiafund.mobile']);

        $profile = app(SocialAuthService::class)->decodeAppleToken($this->makeToken());

        $this->assertSame('apple-user-123', $profile['provider_id']);
        $this->assertSame('user@example.com', $profile['email']);
        $this->assertNull($profile['name']);
    }

    public function test_a_token_signed_with_an_unknown_key_is_rejected(): void
    {
        // Same kid in the header, but signed with a private key whose public half was never
        // published in the (faked) JWKS response — the signature must not verify.
        $token = $this->makeToken(signingKey: self::OTHER_PRIVATE_KEY_PEM);

        $this->expectException(RuntimeException::class);

        app(SocialAuthService::class)->decodeAppleToken($token);
    }

    public function test_an_expired_token_is_rejected(): void
    {
        $this->expectException(RuntimeException::class);

        app(SocialAuthService::class)->decodeAppleToken($this->makeToken(['exp' => time() - 10]));
    }

    public function test_a_token_with_the_wrong_issuer_is_rejected(): void
    {
        $this->expectException(RuntimeException::class);

        app(SocialAuthService::class)->decodeAppleToken($this->makeToken(['iss' => 'https://evil.example.com']));
    }

    public function test_a_token_not_issued_for_this_app_is_rejected(): void
    {
        config(['services.apple.client_id' => 'com.elikiafund.mobile']);

        $this->expectException(RuntimeException::class);

        app(SocialAuthService::class)->decodeAppleToken($this->makeToken(['aud' => 'com.someone-else.app']));
    }

    public function test_aud_is_not_checked_when_no_client_id_is_configured(): void
    {
        config(['services.apple.client_id' => null]);

        $profile = app(SocialAuthService::class)->decodeAppleToken($this->makeToken(['aud' => 'anything']));

        $this->assertSame('apple-user-123', $profile['provider_id']);
    }
}
