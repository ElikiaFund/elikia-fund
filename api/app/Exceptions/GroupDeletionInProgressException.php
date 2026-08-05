<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by GroupDeletionService::request() when a pending deletion request already exists for
 * the group. Caught locally by GroupController and turned into a 409 — same convention as
 * ContributionInProgressException/TontinePayoutException/VaultTransactionException.
 */
class GroupDeletionInProgressException extends RuntimeException {}
