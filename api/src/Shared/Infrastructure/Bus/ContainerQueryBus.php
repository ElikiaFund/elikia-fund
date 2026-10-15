<?php

namespace Elikia\Shared\Infrastructure\Bus;

use Elikia\Shared\Application\Bus\Query;
use Elikia\Shared\Application\Bus\QueryBus;
use Illuminate\Contracts\Container\Container;

final class ContainerQueryBus implements QueryBus
{
    public function __construct(
        private readonly Container $container,
        private readonly HandlerResolver $resolver,
    ) {}

    public function ask(Query $query): mixed
    {
        $handler = $this->container->make($this->resolver->handlerFor($query));

        return $handler($query);
    }
}
