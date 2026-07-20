<?php

namespace App\Services\Payment;

use Exception;
use Illuminate\Http\Client\Response;

/** Thrown when Yabeto rejects a request outright (4xx/5xx) — a *terminal payment failure* (e.g. `status: "failed"`) is not an exception, see PaymentIntentResult::failed(). */
class YabetoRequestException extends Exception
{
    public function __construct(public readonly Response $response)
    {
        parent::__construct("Yabeto request failed with status {$response->status()}: {$response->body()}");
    }

    /**
     * A message safe/useful to show an admin — Yabeto's documented error shape is
     * `{"error": {"message": "...", "code": "..."}}` (yabeto.md §"Error Response Structure"),
     * but falls back to a status-code-based guess when the body doesn't match (some endpoints
     * — e.g. validation errors — use a different shape).
     */
    public function userMessage(): string
    {
        $body = $this->response->json();
        $detail = $body['error']['message'] ?? $body['message'] ?? null;

        return match ($this->response->status()) {
            401 => 'Clé secrète refusée (401) — vérifiez qu\'elle correspond au mode sélectionné (sandbox/live).',
            403 => 'Accès refusé (403) — ce compte n\'est peut-être pas autorisé pour cette opération.',
            404 => 'Identifiant de compte introuvable (404) — vérifiez l\'account ID.',
            429 => 'Trop de requêtes envoyées à Yabeto (429) — réessayez dans un instant.',
            default => $detail
                ? "Yabeto a répondu : {$detail} (HTTP {$this->response->status()})"
                : "Yabeto a refusé la requête (HTTP {$this->response->status()}).",
        };
    }
}
