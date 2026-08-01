<?php

namespace App\Exceptions;

use App\Models\User;

/**
 * Thrown by TontinePayoutService::disburse() specifically when every other eligibility check
 * passed but the recipient hasn't activated a vault yet — carries the recipient so callers (the
 * automatic payout path) can fire an actionable owner nudge instead of just logging a generic
 * "not eligible yet" outcome. Still catchable as a plain TontinePayoutException everywhere that
 * doesn't need the distinction (e.g. GroupController::payoutCycle()'s generic 422 handler).
 */
class TontinePayoutRecipientVaultNotActivatedException extends TontinePayoutException
{
    public function __construct(public readonly User $recipient, string $message)
    {
        parent::__construct($message);
    }
}
