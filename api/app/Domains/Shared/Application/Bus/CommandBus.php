<?php

namespace App\Domains\Shared\Application\Bus;

interface CommandBus
{
    /** Returns whatever the handler returns — typically the id of a created aggregate, or nothing. */
    public function dispatch(Command $command): mixed;
}
