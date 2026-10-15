<?php

namespace App\Domains\Shared\Infrastructure\Bus;

use App\Domains\Shared\Application\Bus\Command;
use App\Domains\Shared\Application\Bus\CommandBus;
use Illuminate\Contracts\Container\Container;
use Illuminate\Database\ConnectionInterface;

/**
 * Resolves `<Command>Handler` from the container and runs it inside one database transaction:
 * the use case's writes and audit rows commit together or not at all, and domain events
 * published during it are delivered only after the commit (see LaravelDomainEventPublisher).
 */
final class ContainerCommandBus implements CommandBus
{
    public function __construct(
        private readonly Container $container,
        private readonly ConnectionInterface $connection,
        private readonly HandlerResolver $resolver,
    ) {}

    public function dispatch(Command $command): mixed
    {
        $handler = $this->container->make($this->resolver->handlerFor($command));

        return $this->connection->transaction(fn () => $handler($command));
    }
}
