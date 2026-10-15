<?php

namespace App\Services\Payment\DTOs;

/**
 * Response shape of GET /v1/connect/accounts/{acct}/compliance. `verification.status` moves
 * through null → created → documents_submitted → in_review → {approved, rejected, needs_info}.
 *
 * `capabilities.resolved` tells whether Yabeto has finished evaluating; `allowed_operations`
 * can only be trusted once resolved=true. The one entry we care about is `"withdraw"`, which
 * only appears after approval and is the single gate for Connect money operations in Elikia.
 */
readonly class ConnectComplianceResult
{
    public function __construct(
        public ?string $verificationStatus,
        public bool $capabilitiesResolved,
        /** @var array<int, string> */
        public array $allowedOperations,
        public array $raw,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            verificationStatus: $data['verification']['status'] ?? null,
            capabilitiesResolved: (bool) ($data['capabilities']['resolved'] ?? false),
            allowedOperations: array_values(array_filter(array_map(
                'strval',
                (array) ($data['capabilities']['allowed_operations'] ?? []),
            ))),
            raw: $data,
        );
    }

    public function toCapabilitiesArray(): array
    {
        return [
            'resolved' => $this->capabilitiesResolved,
            'allowed_operations' => $this->allowedOperations,
        ];
    }
}
