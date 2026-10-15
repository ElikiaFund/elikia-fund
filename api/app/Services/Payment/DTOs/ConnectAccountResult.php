<?php

namespace App\Services\Payment\DTOs;

/**
 * Shape of /v1/connect/accounts create and read responses (docs/fr/connect/accounts/create,
 * docs/fr/connect/payouts). On create, `balances` is empty; on read it carries one row per
 * currency with pending/available/held and the next maturity timestamp.
 *
 * `status` here is the account's own status (always `active` from creation per docs) and
 * reflects existence, NOT KYC — never compare it to pick who can withdraw. KYC lives on
 * ConnectComplianceResult. The comment is here because the docs explicitly warn about this
 * trap ("Ne pas utiliser `status` de GET /v1/connect/accounts/{acct}").
 */
readonly class ConnectAccountResult
{
    /**
     * @param  array<int, array{currency: string, balance: float, pending_balance: float, held_balance: float, next_maturity_at: ?string}>  $balances
     */
    public function __construct(
        public string $id,
        public ?string $status,
        public ?string $feePayer,
        public ?string $environment,
        public ?string $name,
        public ?string $email,
        public array $balances,
        public array $raw,
    ) {}

    public static function fromResponse(array $data): self
    {
        return new self(
            id: (string) ($data['id'] ?? ''),
            status: $data['status'] ?? null,
            feePayer: $data['fee_payer'] ?? null,
            environment: $data['environment'] ?? null,
            name: $data['name'] ?? null,
            email: $data['email'] ?? null,
            balances: array_values(array_map(
                static fn ($row) => [
                    'currency' => (string) ($row['currency'] ?? ''),
                    'balance' => (float) ($row['balance'] ?? 0),
                    'pending_balance' => (float) ($row['pending_balance'] ?? 0),
                    'held_balance' => (float) ($row['held_balance'] ?? 0),
                    'next_maturity_at' => $row['next_maturity_at'] ?? null,
                ],
                (array) ($data['balances'] ?? []),
            )),
            raw: $data,
        );
    }

    public function balanceFor(string $currency): ?array
    {
        $lower = strtolower($currency);

        foreach ($this->balances as $row) {
            if (strtolower($row['currency']) === $lower) {
                return $row;
            }
        }

        return null;
    }
}
