<?php

namespace App\Services\Payment;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;

/**
 * Thin HTTP wrapper around Yabeto's REST API — base URL per environment (yabeto.md §1), bearer
 * auth (§2). Deliberately dumb: no retries/circuit-breaking, callers (YabetoService) decide what
 * a failure means for the payment/payout in progress.
 */
class YabetoClient
{
    public function __construct(private readonly YabetoConfig $config) {}

    public function post(string $path, array $payload = []): Response
    {
        return $this->request()->post($this->baseUrl().$path, $payload);
    }

    public function get(string $path, array $query = []): Response
    {
        return $this->request()->get($this->baseUrl().$path, $query);
    }

    private function request(): PendingRequest
    {
        $request = Http::withToken($this->config->secretKey)
            ->acceptJson()
            ->asJson()
            ->timeout(15);

        // The relay forwards the real Authorization header through untouched — this secret only
        // gates who's allowed to use the relay itself, see cloudflare-relay/worker.js.
        if ($this->config->usesRelay()) {
            $request = $request->withHeaders(['X-Relay-Secret' => $this->config->relaySecret]);
        }

        return $request;
    }

    /**
     * Payment intents / disbursements live under pay.sandbox|pay.api — see yabeto.md §1.
     * (Checkout Sessions use a different, inconsistently-documented domain per §9.3 and are
     * deliberately not implemented — Elikia Fund's flows are in-app confirm, not hosted checkout.)
     *
     * Routes through the Cloudflare Worker relay instead when configured (live mode only) — a
     * temporary network workaround, see cloudflare-relay/ and YabetoConfig::usesRelay().
     */
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
