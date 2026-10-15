<?php

namespace Tests\Feature\Shared;

use DateTimeImmutable;
use Elikia\Shared\Application\Bus\Command;
use Elikia\Shared\Application\Bus\CommandBus;
use Elikia\Shared\Application\Event\DomainEventPublisher;
use Elikia\Shared\Domain\DomainEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use LogicException;
use RuntimeException;
use Tests\TestCase;

class BusTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_failing_handler_rolls_back_its_writes_and_publishes_no_events(): void
    {
        Event::fake([BusTestEvent::class]);

        try {
            app(CommandBus::class)->dispatch(new BusTestCommand(fail: true));
        } catch (RuntimeException) {
        }

        $this->assertDatabaseMissing('settings', ['key' => 'bus_test']);
        Event::assertNotDispatched(BusTestEvent::class);
    }

    public function test_a_successful_handler_commits_returns_its_result_and_publishes_after_commit(): void
    {
        Event::fake([BusTestEvent::class]);

        $result = app(CommandBus::class)->dispatch(new BusTestCommand(fail: false));

        $this->assertSame('done', $result);
        $this->assertDatabaseHas('settings', ['key' => 'bus_test']);
        Event::assertDispatched(BusTestEvent::class);
    }

    public function test_a_command_without_a_handler_fails_loudly(): void
    {
        $this->expectException(LogicException::class);

        app(CommandBus::class)->dispatch(new class implements Command {});
    }
}

final class BusTestCommand implements Command
{
    public function __construct(public readonly bool $fail) {}
}

final class BusTestCommandHandler
{
    public function __construct(private readonly DomainEventPublisher $events) {}

    public function __invoke(BusTestCommand $command): string
    {
        DB::table('settings')->insert(['key' => 'bus_test', 'value' => '1']);
        $this->events->publish(new BusTestEvent);

        if ($command->fail) {
            throw new RuntimeException('boom');
        }

        return 'done';
    }
}

final class BusTestEvent implements DomainEvent
{
    public function occurredAt(): DateTimeImmutable
    {
        return new DateTimeImmutable;
    }
}
