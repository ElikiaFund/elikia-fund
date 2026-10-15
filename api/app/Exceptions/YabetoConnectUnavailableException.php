<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * A Connect operation was refused before reaching Yabeto: Connect isn't activated/enabled for
 * Elikia, or the company lacks data Yabeto requires. Distinct from RuntimeException so callers
 * can catch it without also swallowing database errors (QueryException extends RuntimeException).
 */
class YabetoConnectUnavailableException extends RuntimeException {}
