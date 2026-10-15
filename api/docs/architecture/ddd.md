# ADR-001 — Domain-Driven Design for the Elikia Fund API

- **Status:** accepted, migration in progress
- **Scope:** `api/` only. The mobile app, back-office and website are unaffected: the HTTP contract (routes, payloads, JSON shapes, status codes, French messages) is preserved through the whole migration.

## Context

The API grew as a classic Laravel app: Eloquent models in `app/Models`, business rules split between ~20 `app/Services` classes and fat controllers, and every class able to reach every other one. It works, but the rules that matter most — money movements, tontine payouts, stock valuation, credit scoring — are hard to find, hard to test without a database, and easy to break from an unrelated controller. The move to per-merchant Yabeto Connect accounts doubled the number of money paths, and that cost will keep growing.

## Decision

Restructure the API into **bounded contexts**, each split into **Domain / Application / Infrastructure** layers, with the dependency rules enforced by automated tests. The migration happens **one context per pull request** (strangler pattern), and every PR keeps the full test suite green and the HTTP contract unchanged.

### Where code lives

```
api/
├── app/                      Delivery layer (framework glue only)
│   ├── Http/                 Controllers, FormRequests, middleware — translate HTTP ⇄ commands/queries
│   ├── Console/              Artisan commands — translate CLI/schedule ⇄ commands
│   └── Providers/
└── src/                      The model — namespace Elikia\
    ├── Shared/               Shared kernel: base types every context may use
    │   ├── Domain/           AggregateRoot, DomainEvent, DomainException, ids, Money
    │   ├── Application/      CommandBus, QueryBus, DomainEventPublisher, NotFound/AccessDenied
    │   └── Infrastructure/   Laravel implementations of the above
    └── <Context>/
        ├── Domain/           Aggregates, entities, value objects, domain events, repository interfaces
        ├── Application/      Commands, queries, their handlers, ports (interfaces to the outside)
        └── Infrastructure/   Eloquent records + repositories, read models, adapters, service provider
```

### Dependency rules (enforced by `tests/Architecture`)

| Layer | May depend on | Must not depend on |
|---|---|---|
| `<Context>\Domain` | its own Domain, `Shared\Domain`, PHP | Laravel (`Illuminate\`), `App\`, any Application/Infrastructure, any other context |
| `<Context>\Application` | its own Domain and Application, `Shared\Domain`, `Shared\Application` | Laravel, `App\`, any Infrastructure |
| `<Context>\Infrastructure` | anything in its own context, `Shared`, Laravel, legacy `App\` (only as a temporary adapter) | another context's Domain or Infrastructure |
| Another context | only `<OtherContext>\Application\…` (its public API: commands, queries, DTOs, integration events) | `<OtherContext>\Domain` or `\Infrastructure` |
| `app/Http`, `app/Console` | `Application` of any context, Domain exception classes (to map them to HTTP) | any `Infrastructure` class |

During the migration, legacy `App\` code is exempt. Any legacy file that has to reference a migrated context's Infrastructure (for example the legacy `Company` model's `products()` relation) is listed in an explicit allowlist in the architecture test. The allowlist only shrinks.

## Bounded contexts

| Context | Owns | Kind | Migration order |
|---|---|---|---|
| **Catalog** | Products, product categories, stock movements, weighted-average cost | Supporting | 1 — reference implementation |
| **Bookkeeping** | Income/expense transactions, transaction categories, cash sessions, offline sync | Core | 2 |
| **IdentityAccess** | Users, staff, roles, permissions, password/social login, personal PIN | Generic | 3 |
| **Business** | Companies (the tenant), sectors, departments, active-company resolution | Core | 4 |
| **Engagement** | Support tickets, contact messages, waitlist | Generic | 5 |
| **Platform** | Global settings, admin statistics (read side) | Generic | 6 |
| **Payments** | Yabeto anti-corruption layer, Connect merchant accounts and KYC, fees, webhooks, reconciliation | Core | 7 — after the Connect PR (#19) merges |
| **Savings** | Vaults, vault movements, vault security and fraud signals | Core | 8 |
| **Tontine** | Groups, membership, cycles and rounds, contributions, payouts, deletion votes, round goals, reports | Core | 9 |
| **FinancialIdentity** | Credit-scoring criteria and scores, financial dossier | Core | 10 |
| **Notifications** | Push, email and in-app notifications, driven by other contexts' events | Generic | 11 |

### Context relationships

- **Business is upstream of everything.** Every other context references a company by `CompanyId` only, never through an object graph. This is the "everything is scoped to a company" rule from `AGENTS.md`, now in the type system.
- **Payments is an anti-corruption layer around Yabeto.** Savings and Tontine talk to a `PaymentGateway`-style port in Payments' Application layer and never see Yabeto's HTTP shapes, status names or error codes.
- **Bookkeeping ⇄ Catalog:** a sale linked to a product calls Catalog's `RecordProductSale` command. A restock that should log an expense goes through Catalog's `ExpenseRecorder` port, implemented in Catalog's Infrastructure by calling Bookkeeping.
- **FinancialIdentity is downstream of everything.** It reads other contexts only through their query APIs, never their tables.
- **Notifications only reacts.** Other contexts raise domain events; Notifications' listeners decide what to send. No context calls a notifier directly once it has been migrated.

## Tactical conventions

- **Aggregates** are plain PHP classes extending `Shared\Domain\AggregateRoot`, with no Eloquent and no attributes bag. All state changes go through intention-revealing methods (`restock()`, `recordSale()`), which enforce the invariants and record domain events.
- **Identity:** tables keep auto-increment ids, so a new aggregate has a `null` id until its repository persists it and assigns one. Ids are value objects (`ProductId`, `CompanyId`), never raw ints, past the Application boundary.
- **Money** is `Shared\Domain\Money`: an integer number of minor units (centimes, matching the `decimal(…, 2)` columns) plus a currency. Never use floats for money in the Domain.
- **Repositories** are interfaces in the Domain, implemented in Infrastructure with Eloquent. They load and save whole aggregates. Eloquent classes are named `*Record` and live under `Infrastructure/Persistence/Eloquent`.
- **Commands** are immutable DTOs named in the imperative (`RestockProduct`). Each one has exactly one handler named `<Command>Handler`, an invokable class next to it. `CommandBus::dispatch()` runs every handler inside one database transaction, so a use case and its audit rows commit or roll back together.
- **Queries** (`ListProducts`) go through `QueryBus::ask()` and are answered by read models in Infrastructure, which may read Eloquent and tables directly (CQRS-lite). They return arrays shaped exactly like today's JSON, which is how the HTTP contract stays stable while the write side changes underneath it.
- **Domain events** are recorded by aggregates and published by repositories after the transaction commits (`DomainEventPublisher`), so a listener never sees a state that was later rolled back.
- **Errors:** Domain invariants throw subclasses of `Shared\Domain\DomainException`, with a French message that is safe to show to the user. `Shared\Application\Exception\NotFound` maps to 404 and `AccessDenied` to 403, globally in `bootstrap/app.php`. Controllers map a specific exception themselves only when an endpoint needs a different message.
- **Controllers** do three things: read the validated request, dispatch one command or ask one query, and shape the response. They never touch Eloquent for a migrated context.

## Testing

- **Domain:** fast unit tests in `tests/Unit/<Context>` with no database and no Laravel — just the aggregate.
- **Application and HTTP:** feature tests in `tests/Feature`, written against the HTTP contract. The existing feature tests are the safety net for each migration PR and must pass unchanged.
- **Architecture:** `tests/Architecture` parses the `use` statements and fully-qualified names under `src/` and `app/` and fails on any violation of the dependency rules above.

## Migration playbook (one context per PR)

1. Model the aggregates, value objects, events and repository interfaces in `src/<Context>/Domain`, with unit tests.
2. Write the commands, queries and handlers in `Application`, plus a port for anything the context needs from outside.
3. Move the Eloquent models into `Infrastructure/Persistence/Eloquent` as `*Record`s; write the repositories, read models and the context's service provider.
4. Point the controllers, console commands and legacy callers at the bus, then delete the old service, model and exception classes. No compatibility aliases.
5. Keep the HTTP contract identical. When a response gains fields (a create endpoint now returns the full row), list it under "Before merging" in the PR.
6. `pint` and the full test suite must be clean. Update this file's context table if anything moved.

## Consequences

- **More classes per feature.** A use case is a command, a handler and maybe a port, instead of one service method. That is the price of being able to read a context's rules in one folder and test them without a database.
- **Mapping code** between aggregates and Eloquent records. This is deliberate: it is what keeps Eloquent's magic out of the business rules.
- **Two styles coexist** until the last context migrates. The architecture test's allowlist shows exactly how much legacy remains.
