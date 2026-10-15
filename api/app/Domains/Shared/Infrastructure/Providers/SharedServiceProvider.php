<?php

namespace App\Domains\Shared\Infrastructure\Providers;

use App\Domains\Shared\Application\Bus\CommandBus;
use App\Domains\Shared\Application\Bus\QueryBus;
use App\Domains\Shared\Application\Event\DomainEventPublisher;
use App\Domains\Shared\Infrastructure\Bus\ContainerCommandBus;
use App\Domains\Shared\Infrastructure\Bus\ContainerQueryBus;
use App\Domains\Shared\Infrastructure\Event\LaravelDomainEventPublisher;
use Illuminate\Support\ServiceProvider;

final class SharedServiceProvider extends ServiceProvider
{
    public array $singletons = [
        CommandBus::class => ContainerCommandBus::class,
        QueryBus::class => ContainerQueryBus::class,
        DomainEventPublisher::class => LaravelDomainEventPublisher::class,
    ];
}
