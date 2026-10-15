<?php

namespace App\Domains\Shared\Application\Bus;

interface QueryBus
{
    public function ask(Query $query): mixed;
}
