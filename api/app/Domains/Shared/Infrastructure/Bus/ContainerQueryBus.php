<?php

namespace App\Domains\Shared\Infrastructure\Bus;

use App\Domains\Shared\Application\Bus\Query;
use App\Domains\Shared\Application\Bus\QueryBus;
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
