<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by TontinePayoutService for any business-rule reason a cycle can't be disbursed right
 * now (already paid out, not everyone has contributed, no recipient, recipient's vault isn't
 * activated yet). Caught locally by GroupController::payoutCycle and turned into a 422 with the
 * message as-is — never registered globally, same convention as InsufficientStockException.
 */
class TontinePayoutException extends RuntimeException {}
