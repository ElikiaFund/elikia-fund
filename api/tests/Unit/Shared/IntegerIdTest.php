<?php

namespace Tests\Unit\Shared;

use App\Domains\Shared\Domain\CompanyId;
use App\Domains\Shared\Domain\UserId;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class IntegerIdTest extends TestCase
{
    public function test_ids_of_different_kinds_are_never_equal(): void
    {
        $this->assertTrue(CompanyId::fromInt(7)->equals(CompanyId::fromInt(7)));
        $this->assertFalse(CompanyId::fromInt(7)->equals(UserId::fromInt(7)));
    }

    public function test_ids_must_be_positive(): void
    {
        $this->expectException(InvalidArgumentException::class);

        CompanyId::fromInt(0);
    }
}
