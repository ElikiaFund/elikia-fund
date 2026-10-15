<?php

namespace App\Services\Payment;

/**
 * Normalized view of a Yabeto webhook event. Yabeto's own payload casing is inconsistent
 * across event types — some events ship `data` keys in camelCase (`transfer.created`,
 * `application_fee.created`) and others in snake_case (`funds.available`, both
 * `*_blocked_insufficient_funds`, `application_fee.refunded`) per docs/fr/connect/webhooks.
 *
 * This DTO reads from both without the handlers having to know which case this event
 * happens to use, so YabetoWebhookController stays readable even as Yabeto adds more events.
 */
readonly class YabetoEventPayload
{
    public function __construct(
        public ?string $id,
        public string $type,
        public ?string $accountId,
        public ?string $sandboxId,
        public array $data,
        public ?string $createdAt,
        public array $body,
    ) {}

    public static function fromRequest(string $headerEvent, array $body): self
    {
        // The header is authoritative for legacy events, whose body has no `type` field.
        $type = $headerEvent !== '' ? $headerEvent : ($body['type'] ?? '');

        return new self(
            id: $body['id'] ?? null,
            type: (string) $type,
            accountId: $body['accountId'] ?? $body['account_id'] ?? null,
            sandboxId: $body['sandboxId'] ?? $body['sandbox_id'] ?? null,
            data: (array) ($body['data'] ?? []),
            createdAt: $body['createdAt'] ?? $body['created_at'] ?? null,
            body: $body,
        );
    }

    /** Connect events use the `{id, type, accountId, data}` envelope; legacy events are flat. */
    public function isConnectEvent(): bool
    {
        return str_starts_with($this->type, 'connect.');
    }

    /**
     * Case-insensitive data lookup across snake_case and camelCase forms — `pending_balance`
     * will find `pendingBalance` and vice versa. Nested paths use dot syntax
     * (e.g. "transfer.amount") and recurse through intermediate arrays.
     */
    public function dataGet(string $path, mixed $default = null): mixed
    {
        $segments = explode('.', $path);
        $node = $this->data;

        foreach ($segments as $segment) {
            if (! is_array($node)) {
                return $default;
            }

            $key = $this->findKey($node, $segment);
            if ($key === null) {
                return $default;
            }

            $node = $node[$key];
        }

        return $node;
    }

    private function findKey(array $node, string $segment): ?string
    {
        if (array_key_exists($segment, $node)) {
            return $segment;
        }

        $normalized = strtolower(str_replace('_', '', $segment));

        foreach (array_keys($node) as $existing) {
            if (strtolower(str_replace('_', '', (string) $existing)) === $normalized) {
                return (string) $existing;
            }
        }

        return null;
    }
}
