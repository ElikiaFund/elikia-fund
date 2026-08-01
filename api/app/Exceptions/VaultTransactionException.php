<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by VaultTransactionService for any business-rule reason a deposit/withdrawal can't
 * proceed right now (a movement of that type is already processing, insufficient balance).
 * Caught locally by VaultController and turned into a 409, never registered globally — same
 * convention as TontinePayoutException/InsufficientStockException.
 */
class VaultTransactionException extends RuntimeException {}
