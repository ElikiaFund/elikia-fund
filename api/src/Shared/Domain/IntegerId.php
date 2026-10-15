<?php

namespace Elikia\Shared\Domain;

use InvalidArgumentException;

/**
 * Base for identifiers backed by an auto-increment column. Subclasses exist so a ProductId can
 * never be passed where a CompanyId is expected.
 */
abstract readonly class IntegerId
{
    final private function __construct(public int $value)
    {
        if ($value < 1) {
            throw new InvalidArgumentException(static::class." must be a positive integer, got {$value}.");
        }
    }

    public static function fromInt(int $value): static
    {
        return new static($value);
    }

    public function equals(self $other): bool
    {
        return $other instanceof static && $other->value === $this->value;
    }

    public function __toString(): string
    {
        return (string) $this->value;
    }
}
