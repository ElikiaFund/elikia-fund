<?php

namespace Tests\Unit\Shared;

use App\Domains\Shared\Domain\Money;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public function test_it_reads_the_decimal_strings_the_database_returns(): void
    {
        $this->assertSame(150050, Money::fromDecimal('1500.50')->minorUnits);
        $this->assertSame(150000, Money::fromDecimal(1500)->minorUnits);
        $this->assertSame(29, Money::fromDecimal(0.29)->minorUnits);
    }

    public function test_it_formats_back_to_two_decimals_including_negatives(): void
    {
        $this->assertSame('1500.50', Money::ofMinor(150050)->toDecimalString());
        $this->assertSame('0.05', Money::ofMinor(5)->toDecimalString());
        $this->assertSame('-12.30', Money::ofMinor(-1230)->toDecimalString());
    }

    public function test_arithmetic_is_exact(): void
    {
        $total = Money::fromDecimal('0.10')->add(Money::fromDecimal('0.20'))->multiply(3);

        $this->assertTrue($total->equals(Money::fromDecimal('0.90')));
        $this->assertTrue(Money::fromDecimal(5)->subtract(Money::fromDecimal(5))->isZero());
    }

    public function test_currencies_never_mix(): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::fromDecimal(1, 'XAF')->add(Money::fromDecimal(1, 'EUR'));
    }
}
