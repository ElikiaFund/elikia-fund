<?php

namespace Elikia\Shared\Application\Bus;

/**
 * Marker for a state-changing use case. Each Command class `Foo` has exactly one invokable
 * handler `FooHandler` in the same namespace; the bus runs it inside one database transaction.
 */
interface Command {}
