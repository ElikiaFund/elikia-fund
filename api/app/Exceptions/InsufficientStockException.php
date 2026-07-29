<?php

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by ProductStockService when a stock-decreasing operation would take a tracked product's
 * stock_quantity below zero and the caller asked for that to be enforced. Caught locally by the
 * controller that triggered it (TransactionController, ProductController) — never registered
 * globally, since the 422 message differs slightly by context.
 */
class InsufficientStockException extends RuntimeException {}
