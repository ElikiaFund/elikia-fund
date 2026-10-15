<?php

namespace Elikia\Shared\Application\Bus;

interface QueryBus
{
    public function ask(Query $query): mixed;
}
