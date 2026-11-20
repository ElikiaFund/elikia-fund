<?php

namespace App\Services\Payment\DTOs;

/**
 * Response shape of POST /v1/connect/accounts/{acct}/withdrawals (docs/fr/connect/payouts).
 *
 * CRITICAL: Yabeto's call waits for the mobile money operator synchronously, and an operator
 * refusal still comes back as 201 with `status: "failed"`. Callers must inspect `status`,
 * never trust the HTTP code alone. Also: there is no partial-amount support — every call
 * moves the seller's full available balance in one shot.
 */
readonly class ConnectWithdrawalResult
{
    public function __construct(
        public string $id,
        public int $amount,
        public string $currency,
        public string $status,
        public ?string $destination,
        public array $raw,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            id: (string) ($data['id'] ?? ''),
            amount: (int) ($data['amount'] ?? 0),
            currency: (string) ($data['currency'] ?? ''),
            status: (string) ($data['status'] ?? ''),
            destination: $data['destination'] ?? null,
            raw: $data,
        );
    }

    public function isSuccessful(): bool
    {
        return $this->status === 'succeeded';
    }
}
