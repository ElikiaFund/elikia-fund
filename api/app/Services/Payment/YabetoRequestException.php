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
}
