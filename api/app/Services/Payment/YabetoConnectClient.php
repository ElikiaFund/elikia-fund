<?php

namespace App\Services\Payment;

use App\Services\Payment\DTOs\ConnectAccountResult;
use App\Services\Payment\DTOs\ConnectComplianceResult;
use App\Services\Payment\DTOs\ConnectOnboardingLinkResult;
use App\Services\Payment\DTOs\ConnectWithdrawalResult;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Connect-specific HTTP wrapper (docs/fr/connect/*). Mirrors YabetoClient's transport shape
 * (same base URL / relay rules / timeout) but is split out because Connect endpoints need
 * per-call `Idempotency-Key` headers and come back with resource shapes the plain
 * YabetoClient's callers never see — mixing both into one class would smear two concerns.
 *
 * Reuses YabetoConfig (same env/key resolution as the plain client) and therefore inherits
 * the Cloudflare Worker relay automatically.
 */
class YabetoConnectClient
{
    public function __construct(private readonly YabetoConfig $config) {}

    /**
     * POST /v1/connect/accounts (docs/fr/connect/accounts/create). `Idempotency-Key` is REQUIRED
     * on this route specifically (unlike most others), and reusing it returns the same 201 with
     * the same `id` — safe for retries. `phone`, `type`, `fee_payer` would be rejected with 422
     * rule="unsupported" per the spec, so we never send them.
     */
    public function createAccount(string $idempotencyKey, string $country, string $currency, string $name, string $email): ConnectAccountResult
    {
        $response = $this->request()
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->post($this->baseUrl().'/connect/accounts', [
                'country' => $country,
                'currency' => $currency,
                'name' => $name,
                'email' => $email,
            ]);

        $this->assertSuccessful($response);

        return ConnectAccountResult::fromResponse($response->json());
    }

    /**
     * GET /v1/connect/accounts/{acct} — current state of the connected account including
     * balances (pending/available/held + next_maturity_at per currency). Used by the reconcile
     * command to detect drift between local ledger and Yabeto's side.
     */
    public function getAccount(string $accountId): ConnectAccountResult
    {
        $response = $this->request()->get($this->baseUrl()."/connect/accounts/{$accountId}");
        $this->assertSuccessful($response);

        return ConnectAccountResult::fromResponse($response->json());
    }

    /**
     * POST /v1/connect/accounts/{acct}/onboarding_links (docs/fr/connect/accounts/onboarding).
     * Empty body, no idempotency key (replays resume the existing session rather than opening a
     * new one — the docs are explicit about this, so a regenerate just means "call it again").
     */
    public function createOnboardingLink(string $accountId): ConnectOnboardingLinkResult
    {
        $response = $this->request()->post($this->baseUrl()."/connect/accounts/{$accountId}/onboarding_links");
        $this->assertSuccessful($response);

        return ConnectOnboardingLinkResult::fromResponse($response->json());
    }

    /**
     * GET /v1/connect/accounts/{acct}/compliance — the authoritative read of verification state.
     * Must be polled: Connect emits NO webhook on verification changes.
     */
    public function getCompliance(string $accountId): ConnectComplianceResult
    {
        $response = $this->request()->get($this->baseUrl()."/connect/accounts/{$accountId}/compliance");
        $this->assertSuccessful($response);

        return ConnectComplianceResult::fromResponse($response->json());
    }

    /**
     * POST /v1/connect/accounts/{acct}/withdrawals — Connect withdrawals are ALL-OR-NOTHING
     * (empty body; sending `amount` returns 422). The call is synchronous; a 201 with
     * status="failed" is a real failure, not a transport error — callers must inspect
     * $result->status (docs/fr/connect/payouts).
     */
    public function withdraw(string $accountId, string $idempotencyKey): ConnectWithdrawalResult
    {
        $response = $this->request()
            ->withHeaders(['Idempotency-Key' => $idempotencyKey])
            ->post($this->baseUrl()."/connect/accounts/{$accountId}/withdrawals");

        $this->assertSuccessful($response);

        return ConnectWithdrawalResult::fromResponse($response->json());
    }

    private function assertSuccessful(Response $response): void
    {
        if ($response->failed()) {
            throw new YabetoRequestException($response);
        }
    }

    private function request(): PendingRequest
    {
        $request = Http::withToken($this->config->secretKey)
            ->acceptJson()
            ->asJson()
            ->timeout(15);

        if ($this->config->usesRelay()) {
            $request = $request->withHeaders(['X-Relay-Secret' => $this->config->relaySecret]);
        }

        return $request;
    }

    private function baseUrl(): string
    {
        if ($this->config->usesRelay()) {
            return rtrim($this->config->relayUrl, '/').'/v1';
        }

        return $this->config->isSandbox()
            ? 'https://pay.sandbox.yabetoopay.com/v1'
            : 'https://pay.api.yabetoopay.com/v1';
    }
}
