<?php

namespace App\Services\Payment;

/** HMAC-SHA256 signature verification for inbound Yabeto webhooks — see yabeto.md §7.2. */
class YabetoWebhookVerifier
{
    public function verify(string $rawBody, string $timestamp, string $signature, string $secret): bool
    {
        if ($timestamp === '' || $signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);

        // Signature header is documented as `v1=<hex>` — accept either form defensively, since
        // the docs' own examples aren't consistent about the prefix (see yabeto.md §9.7).
        $provided = str_starts_with($signature, 'v1=') ? substr($signature, 3) : $signature;

        return hash_equals($expected, $provided);
    }
}
