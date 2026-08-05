<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by VaultSecurityService when the vault's PIN is locked out after repeated failed
 * attempts. Caught locally by VaultController and turned into a 423, never registered globally —
 * same convention as VaultTransactionException.
 */
class VaultLockedException extends RuntimeException {}
