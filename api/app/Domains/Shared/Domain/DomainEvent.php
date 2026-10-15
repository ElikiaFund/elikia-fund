<?php

namespace App\Domains\Shared\Domain;

use DateTimeImmutable;

interface DomainEvent
{
    public function occurredAt(): DateTimeImmutable;
}
