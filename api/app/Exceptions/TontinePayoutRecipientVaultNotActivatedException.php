<?php

namespace App\Exceptions;

use App\Models\Group;
use App\Models\User;

/**
 * Thrown by TontinePayoutService::disburse() specifically when every other eligibility check
 * passed but the tontine's own company hasn't activated a vault yet — carries both the group
 * (whose company's vault is what actually matters — see TontinePayoutService) and the resolved
 * recipient (kept for the notification's human context: "so-and-so is due a payout, but...") so
 * callers (the automatic payout path) can fire an actionable owner nudge instead of just logging
 * a generic "not eligible yet" outcome. Still catchable as a plain TontinePayoutException
 * everywhere that doesn't need the distinction (e.g. GroupController::payoutCycle()'s generic
 * 422 handler).
 */
class TontinePayoutRecipientVaultNotActivatedException extends TontinePayoutException
{
    public function __construct(public readonly Group $group, public readonly User $recipient, string $message)
    {
        parent::__construct($message);
    }
}
