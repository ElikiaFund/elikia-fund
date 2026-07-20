<?php

namespace App\Services\Payment;

use App\Services\Payment\DTOs\DisbursementResult;
use App\Services\Payment\DTOs\PaymentIntentResult;
use Illuminate\Http\Client\Response;

/**
 * Domain-facing wrapper over Yabeto Pay (see yabeto.md). Named around what Elikia Fund does
 * (vault deposit/withdrawal, tontine contribution/payout), not a 1:1 mirror of Yabeto's resource
 * names. Every network call can throw YabetoRequestException — callers (VaultController,
 * GroupController) decide the user-facing fallback.
 */
class YabetoService
{
    /** Mobile's `payment_method` values → Yabeto's `operator_name` values (yabeto.md §4). */
    public const OPERATOR_MAP = [
        'mtn_momo' => 'mtn',
        'airtel_money' => 'airtel',
    ];

    /** Only country documented as covered — see yabeto.md §4 and §9.1. */
    private const COUNTRY = 'cg';

    public function __construct(
        private readonly YabetoClient $client,
        private readonly YabetoConfig $config,
    ) {}

    public function isEnabled(): bool
    {
        return $this->config->isReady();
    }

    public function createPaymentIntent(int $amountXaf, string $description, array $metadata = []): PaymentIntentResult
    {
        $response = $this->client->post('/payment-intents', [
            'amount' => $amountXaf,
            'currency' => 'xaf',
            'description' => $description,
            'metadata' => $metadata,
        ]);

        $this->assertSuccessful($response);

        return PaymentIntentResult::fromCreateResponse($response->json());
    }

    public function confirmPaymentIntent(
        string $intentId,
        string $clientSecret,
        string $msisdn,
        string $operator,
        string $firstName,
        string $lastName,
    ): PaymentIntentResult {
        // Confirm can come back with a terminal `failed`/`expired` status inside a 200 — that's
        // a normal outcome (yabeto.md §5.2), so it's still treated as "successful" here at the
        // transport level; assertSuccessful only guards against the request itself being rejected.
        $response = $this->client->post("/payment-intents/{$intentId}/confirm", [
            'client_secret' => $clientSecret,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'payment_method_data' => [
                'type' => 'momo',
                'momo' => [
                    'country' => self::COUNTRY,
                    'msisdn' => $msisdn,
                    'operator_name' => $operator,
                ],
            ],
        ]);

        $this->assertSuccessful($response);

        return PaymentIntentResult::fromConfirmResponse($response->json());
    }

    public function getPaymentIntent(string $intentId): PaymentIntentResult
    {
        $response = $this->client->get("/payment-intents/{$intentId}");
        $this->assertSuccessful($response);

        return PaymentIntentResult::fromConfirmResponse($response->json());
    }

    public function createDisbursement(int $amountXaf, string $msisdn, string $operator, string $firstName, string $lastName): DisbursementResult
    {
        $response = $this->client->post('/disbursements', [
            'amount' => $amountXaf,
            'currency' => 'XAF',
            'first_name' => $firstName,
            'last_name' => $lastName,
            'payment_method_data' => [
                'type' => 'momo',
                'momo' => [
                    'msisdn' => $msisdn,
                    'country' => strtoupper(self::COUNTRY),
                    'operator_name' => $operator,
                ],
            ],
        ]);

        $this->assertSuccessful($response);

        return DisbursementResult::fromResponse($response->json());
    }

    public function getDisbursement(string $disbursementId): DisbursementResult
    {
        // Singular in the URL per the docs (vs. plural on create) — see yabeto.md §6.2.
        $response = $this->client->get("/disbursement/{$disbursementId}");
        $this->assertSuccessful($response);

        return DisbursementResult::fromResponse($response->json());
    }

    /**
     * Lightweight credential check for the back-office "Tester la connexion" button — lists
     * payment intents (a safe, read-only, auth-requiring call that doesn't need `accountId` in
     * the URL — Yabeto derives the merchant from the secret key itself, per the `accountId`
     * field Yabeto echoes back in payment intent responses) rather than creating anything.
     *
     * Deliberately *not* using the account-scoped webhooks list (`/account/{id}/webhooks`) for
     * this — that path is the least corroborated one in Yabeto's docs (only shown once, never
     * referenced by the official PHP SDK), so a 404 there is as likely to mean "this route
     * doesn't exist as documented" as "this accountId is wrong". See yabeto.md §9.
     */
    public function listPaymentIntents(int $limit = 3): array
    {
        $response = $this->client->get('/payment-intents', ['limit' => $limit]);
        $this->assertSuccessful($response);

        return $response->json('data', []);
    }

    /**
     * Lists webhooks registered for the account — used by the "Enregistrer le webhook" flow's
     * own bookkeeping, not for the connection test (see listPaymentIntents() above).
     */
    public function listWebhooks(): array
    {
        $response = $this->client->get("/account/{$this->config->accountId}/webhooks");
        $this->assertSuccessful($response);

        return $response->json('data', []);
    }

    /**
     * @return array{id: string, secret: string} the webhook secret is only ever returned by
     *                                           Yabeto once, at registration time — the caller (Admin\YabetoSettingController) is
     *                                           responsible for persisting it immediately and showing it to the admin exactly once.
     */
    public function registerWebhook(string $url, array $events): array
    {
        $response = $this->client->post("/account/{$this->config->accountId}/webhooks", [
            'url' => $url,
            'description' => 'Elikia Fund',
            'enabled_events' => $events,
        ]);

        $this->assertSuccessful($response);

        return $response->json();
    }

    private function assertSuccessful(Response $response): void
    {
        if ($response->failed()) {
            throw new YabetoRequestException($response);
        }
    }
}
