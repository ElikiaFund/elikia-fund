<?php

namespace App\Services\Payment\DTOs;

/** See yabeto.md §6.1 — disbursements are always created in `processing`, never synchronously terminal. */
readonly class DisbursementResult
{
    public function __construct(
        public string $id,
        public string $status,
        public ?string $failureMessage = null,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            id: $data['id'] ?? '',
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
        return in_array($this->status, ['failed', 'canceled'], true);
    }
}
