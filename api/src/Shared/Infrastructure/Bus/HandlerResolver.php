<?php

namespace Elikia\Shared\Infrastructure\Bus;

use LogicException;

/** Convention: the handler for message class `X` is the invokable class `XHandler`. */
final class HandlerResolver
{
    /** @return class-string */
    public function handlerFor(object $message): string
    {
        $handler = $message::class.'Handler';

        if (! class_exists($handler) || ! method_exists($handler, '__invoke')) {
            throw new LogicException("No invokable handler {$handler} for ".$message::class.'.');
        }

        return $handler;
    }
}
