<?php

namespace App\Domains\Shared\Application\Event;

use App\Domains\Shared\Domain\DomainEvent;

interface DomainEventPublisher
{
    /** Delivers the events once the surrounding transaction commits — never for a rolled-back change. */
    public function publish(DomainEvent ...$events): void;
}
