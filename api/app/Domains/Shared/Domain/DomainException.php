<?php

namespace App\Domains\Shared\Domain;

/**
 * A business rule was violated. The message is French and safe to show to the end user —
 * bootstrap/app.php renders any uncaught subclass as a 422 with that message.
 */
abstract class DomainException extends \DomainException {}
