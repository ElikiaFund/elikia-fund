<?php

namespace App\Services\Payment\DTOs;

/**
 * Normalizes the two shapes Yabeto returns for a payment intent (the `create` response uses
 * `id`/`clientSecret`; the `confirm` response uses `intentId`/no client secret and adds
 * `status`/`failureMessage`) into one consistent object — see yabeto.md §5.1–§5.2.
 */
readonly class PaymentIntentResult
{
    public function __construct(
        public string $id,
        public ?string $clientSecret,
        public string $status,
        public ?string $failureMessage = null,
    ) {}

    public static function fromCreateResponse(array $data): self
    {
        return new self(
            id: $data['id'],
            clientSecret: $data['clientSecret'] ?? null,
            status: $data['status'] ?? 'pending',
        );
    }

    public static function fromConfirmResponse(array $data): self
    {
        return new self(
            id: $data['intentId'] ?? $data['id'] ?? '',
            clientSecret: null,
            status: $data['status'] ?? 'processing',
            failureMessage: $data['failureMessage'] ?? null,
        );
    }

    public function succeeded(): bool
    {
        return $this->status === 'succeeded';
    }

    public function failed(): bool
    {
        return in_array($this->status, ['failed', 'expired', 'canceled'], true);
    }
}
