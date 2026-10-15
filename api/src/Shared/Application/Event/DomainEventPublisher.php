<?php

namespace Elikia\Shared\Application\Event;

use Elikia\Shared\Domain\DomainEvent;

interface DomainEventPublisher
{
    /** Delivers the events once the surrounding transaction commits — never for a rolled-back change. */
    public function publish(DomainEvent ...$events): void;
}
