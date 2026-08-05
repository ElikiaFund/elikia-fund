<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by FeeService when a requested amount is too small to actually net anything after fees
 * (only realistically reachable on a vault deposit, via the fixed-fee component). Caught locally
 * by whichever controller/service called into FeeService and turned into a 422 — never registered
 * globally, same convention as every other domain exception in this codebase.
 */
class FeeException extends RuntimeException {}
