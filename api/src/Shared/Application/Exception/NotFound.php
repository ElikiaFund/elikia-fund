<?php

namespace Elikia\Shared\Application\Exception;

use RuntimeException;

/** Rendered as 404 « Ressource introuvable. » by bootstrap/app.php. */
final class NotFound extends RuntimeException
{
    public static function resource(string $resource, int|string $id): self
    {
        return new self("{$resource} #{$id} not found.");
    }
}
