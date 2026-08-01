<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by ContributionService::reserve() when a succeeded or already-processing contribution
 * exists for a (group, user, cycle_period) triple — a prior failed attempt never blocks a retry.
 * Caught locally by GroupController and turned into a 409, never registered globally — same
 * convention as TontinePayoutException/VaultTransactionException.
 */
class ContributionInProgressException extends RuntimeException {}
