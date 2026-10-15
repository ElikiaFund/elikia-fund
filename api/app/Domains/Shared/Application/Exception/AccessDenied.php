<?php

namespace App\Domains\Shared\Application\Exception;

use RuntimeException;

/**
 * The resource exists but belongs to another company (or user). Rendered as 403
 * « Action non autorisée. » by bootstrap/app.php — the message here is for logs only.
 */
final class AccessDenied extends RuntimeException
{
    public static function toResource(string $resource, int|string $id): self
    {
        return new self("Access denied to {$resource} #{$id}.");
    }
}
