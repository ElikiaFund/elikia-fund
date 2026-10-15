<?php

namespace Elikia\Shared\Infrastructure\Event;

use Elikia\Shared\Application\Event\DomainEventPublisher;
use Elikia\Shared\Domain\DomainEvent;
use Illuminate\Contracts\Events\Dispatcher;
use Illuminate\Database\ConnectionInterface;

/**
 * Domain events become ordinary Laravel events, so listeners register the usual way
 * (`Event::listen(ProductRestocked::class, …)`). Dispatch is deferred to after commit; outside a
 * transaction, afterCommit() runs the callback immediately.
 */
final class LaravelDomainEventPublisher implements DomainEventPublisher
{
    public function __construct(
        private readonly Dispatcher $events,
        private readonly ConnectionInterface $connection,
    ) {}

    public function publish(DomainEvent ...$events): void
    {
        foreach ($events as $event) {
            $this->connection->afterCommit(fn () => $this->events->dispatch($event));
        }
    }
}
