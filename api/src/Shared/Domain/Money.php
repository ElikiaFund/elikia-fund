<?php

namespace Elikia\Shared\Domain;

use InvalidArgumentException;

/**
 * An amount in integer minor units (centimes), matching the `decimal(…, 2)` columns the API
 * stores. XAF has no centimes in practice, but averaged costs (see Catalog) do produce
 * fractional values, so two decimal places are kept rather than rounding to whole francs.
 */
final readonly class Money
{
    private const MINOR_PER_MAJOR = 100;

    private function __construct(
        public int $minorUnits,
        public string $currency,
    ) {}

    public static function ofMinor(int $minorUnits, string $currency = 'XAF'): self
    {
        return new self($minorUnits, strtoupper($currency));
    }

    /** Accepts what the database and validated requests produce: "1500.50", 1500, 1500.5. */
    public static function fromDecimal(string|int|float $amount, string $currency = 'XAF'): self
    {
        if (! is_numeric($amount)) {
            throw new InvalidArgumentException("Not a numeric amount: {$amount}");
        }

        return new self((int) round(((float) $amount) * self::MINOR_PER_MAJOR), strtoupper($currency));
    }

    public static function zero(string $currency = 'XAF'): self
    {
        return new self(0, strtoupper($currency));
    }

    public function toDecimalString(): string
    {
        $sign = $this->minorUnits < 0 ? '-' : '';
        $absolute = abs($this->minorUnits);

        return sprintf('%s%d.%02d', $sign, intdiv($absolute, self::MINOR_PER_MAJOR), $absolute % self::MINOR_PER_MAJOR);
    }

    public function add(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->minorUnits + $other->minorUnits, $this->currency);
    }

    public function subtract(self $other): self
    {
        $this->assertSameCurrency($other);

        return new self($this->minorUnits - $other->minorUnits, $this->currency);
    }

    public function multiply(int $factor): self
    {
        return new self($this->minorUnits * $factor, $this->currency);
    }

    public function isZero(): bool
    {
        return $this->minorUnits === 0;
    }

    public function isNegative(): bool
    {
        return $this->minorUnits < 0;
    }

    public function equals(self $other): bool
    {
        return $this->currency === $other->currency && $this->minorUnits === $other->minorUnits;
    }

    private function assertSameCurrency(self $other): void
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException("Currency mismatch: {$this->currency} vs {$other->currency}.");
        }
    }
}
