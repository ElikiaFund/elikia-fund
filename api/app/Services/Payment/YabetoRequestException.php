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
     * A message safe/useful to show an admin. Yabeto's documented error shape is
     * `{"error": {"message": "...", "code": "..."}}` (yabeto.md §"Error Response Structure") —
     * when present, that actual detail is shown ahead of any status-code guess of ours, since
     * Yabeto's own explanation is strictly more reliable than us pattern-matching on a status
     * code alone (a 404 can mean "bad account id", but just as easily "this route isn't real as
     * documented" — see yabeto.md §9 for how unreliable some of Yabeto's own endpoint docs are).
     */
    public function userMessage(): string
    {
        $body = $this->response->json();
        $detail = $body['error']['message'] ?? $body['message'] ?? null;

        if ($detail) {
            return "Yabeto a répondu : {$detail} (HTTP {$this->response->status()})";
        }

        return match ($this->response->status()) {
            401 => 'Clé secrète refusée (401) — vérifiez qu\'elle correspond au mode sélectionné (sandbox/live).',
            403 => 'Accès refusé (403) — ce compte n\'est peut-être pas autorisé pour cette opération.',
            404 => "Ressource introuvable (404) — soit une valeur saisie est incorrecte, soit cet endpoint Yabeto n'existe pas tel que documenté (voir yabeto.md §9).",
            429 => 'Trop de requêtes envoyées à Yabeto (429) — réessayez dans un instant.',
            default => "Yabeto a refusé la requête (HTTP {$this->response->status()}).",
        };
    }
}
