<?php

namespace App\Services\Payment;

/** HMAC-SHA256 signature verification for inbound Yabeto webhooks — see yabeto.md §7.2. */
class YabetoWebhookVerifier
{
    /** Reject webhooks whose timestamp is older than this — closes the replay window yabeto.md §9.7 flags as unenforced. */
    private const MAX_TIMESTAMP_AGE_SECONDS = 300;

    public function verify(string $rawBody, string $timestamp, string $signature, string $secret): bool
    {
        if ($timestamp === '' || $signature === '') {
            return false;
        }

        if (! ctype_digit($timestamp) || abs(time() - (int) $timestamp) > self::MAX_TIMESTAMP_AGE_SECONDS) {
            return false;
        }

        $expected = hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);

        // Signature header is documented as `v1=<hex>` — accept either form defensively, since
        // the docs' own examples aren't consistent about the prefix (see yabeto.md §9.7).
        $provided = str_starts_with($signature, 'v1=') ? substr($signature, 3) : $signature;

        return hash_equals($expected, $provided);
    }
}
