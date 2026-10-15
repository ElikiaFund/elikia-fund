<?php

namespace App\Services\Payment\DTOs;

/**
 * Response shape of POST /v1/connect/accounts/{acct}/onboarding_links. The URL lives on
 * verify.yabetoo.com and is where the vendor uploads KYC docs AND registers their own
 * payout destination (which is why `phone` is refused at account creation — the vendor
 * owns their own destination, not the marketplace).
 *
 * The route takes no idempotency key: replays resume the existing session rather than
 * opening a new one, so a regenerate is safe and expected.
 */
readonly class ConnectOnboardingLinkResult
{
    public function __construct(
        public string $url,
        public ?string $expiresAt,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            url: (string) ($data['url'] ?? ''),
            expiresAt: $data['expires_at'] ?? null,
        );
    }
}
