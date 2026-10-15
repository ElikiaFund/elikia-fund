<?php

namespace Elikia\Shared\Infrastructure\Providers;

use Elikia\Shared\Application\Bus\CommandBus;
use Elikia\Shared\Application\Bus\QueryBus;
use Elikia\Shared\Application\Event\DomainEventPublisher;
use Elikia\Shared\Infrastructure\Bus\ContainerCommandBus;
use Elikia\Shared\Infrastructure\Bus\ContainerQueryBus;
use Elikia\Shared\Infrastructure\Event\LaravelDomainEventPublisher;
use Illuminate\Support\ServiceProvider;

final class SharedServiceProvider extends ServiceProvider
{
    public array $singletons = [
        CommandBus::class => ContainerCommandBus::class,
        QueryBus::class => ContainerQueryBus::class,
        DomainEventPublisher::class => LaravelDomainEventPublisher::class,
    ];
}
