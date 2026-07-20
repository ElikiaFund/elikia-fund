# Elikia Fund — API

Laravel 13 + Sanctum (bearer tokens) + MySQL. This is the backend for **Elikia Fund**, a financial-identity platform for informal businesses in Francophone Africa: an offline-capable cash flow tracker, a PIN-protected savings vault, and group savings circles ("tontines") — all feeding a live credit/loan-admissibility score, the actual product mission. Three apps talk to this one API:

```
api/           this app — Laravel 13 + Sanctum + MySQL
mobile/        Expo (React Native + TypeScript) — end-user app
back-office/   Vite + React + shadcn/ui — admin app
```

See the root [`fintech-mvp-one-week-plan.md`](../fintech-mvp-one-week-plan.md) for the original sprint scope/day-by-day plan and [`yabeto.md`](../yabeto.md) for the full mobile-money payment provider reference this API integrates against.

## Setup

1. Create a local MySQL database named `elikia_fund`.
2. `composer install`
3. `cp .env.example .env` and fill in `DB_USERNAME` / `DB_PASSWORD` for your MySQL install, plus `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID` / `APPLE_CLIENT_ID` once you have them (see Auth below), and `YABETO_*` if you have real Yabeto Pay sandbox credentials (optional — see Payments below).
4. `php artisan key:generate`
5. `php artisan migrate:fresh --seed` (seeds two staff logins — `admin@elikia-fund.test` / `password` with the Super Admin role, `support@elikia-fund.test` / `password` with the read-only Support role, both dev only — plus ~30 realistic consumer users with transactions, vaults, companies, products, and 5 tontines with contributions; `APP_FAKER_LOCALE=fr_FR` gives French names)
6. `php artisan storage:link` (serves uploaded avatars from `storage/app/public`)
7. `php artisan serve`

API is served at `http://localhost:8000/api`.

For the automated tontine reminder/report system (see below) to actually fire, something needs to drive Laravel's scheduler: `php artisan schedule:work` in local dev, a real `* * * * * php artisan schedule:run` cron entry in production.

```
composer install
php artisan migrate:fresh --seed
php artisan storage:link
php artisan serve                 # http://localhost:8000/api
php artisan schedule:work          # separate terminal — drives the tontine reminder/report cron

php artisan route:list --path=api # inspect registered routes
./vendor/bin/pint                 # format (run before committing PHP changes)
php artisan test                  # or: ./vendor/bin/phpunit
```

## Auth

Two separate auth flows share the same `users` table and Sanctum tokens:

- **Mobile app (end users)** — OAuth (`POST /auth/google`, `/auth/apple`, `/auth/facebook`) or email/password (`POST /auth/register`, `/auth/login`). OAuth verifies the provider token server-side (`App\Services\SocialAuthService`) and finds-or-creates the user by provider id / email. **The Apple flow decodes the identity token's payload without verifying its signature** — see the `TODO` in `SocialAuthService::decodeAppleToken()` for what's needed before production (JWKS signature verification via `firebase/php-jwt`). `register` rejects a duplicate email outright rather than attaching a password to an existing OAuth account by email match (that would be an account-takeover vector — anyone who knows a victim's email could hijack their account); linking a password onto an OAuth account is only possible authenticated, via `PUT /me`.
- **Back office (staff)** — classic email + password: `POST /admin/login`, rejected unless the account has a `role_id`. Staff are created via the seeder or the Personnel page, not self-registration.
- Both flows issue a Sanctum personal access token; `POST /logout` and `GET /me` work for either. `PUT /me` (update name/email/password) and `POST /me/avatar` (multipart upload) work for either too. `POST /me/push-token` registers this device's Expo push token (see Notifications below).

## Roles & permissions

`is_admin` is now a **computed** attribute (`role_id !== null`), not a column — kept as a real JSON field via `$appends` so existing consumers (mobile, back-office) didn't need to change. The actual source of truth is `users.role_id` → `roles` → `permission_role` → `permissions`.
- The permission catalog (`PermissionSeeder::catalog()`) is fixed/code-defined, not user-creatable — spans `users.*`, `transactions.*`, `groups.*`, `companies.*`, `personnel.*`, `roles.*`, and `settings.*` (each `.view`/`.delete` or `.manage`).
- Roles are fully custom: `Admin\RoleController` CRUDs a role's name + its permission set (`permission_role` sync).
- `Admin\PersonnelController` manages **internal staff** — literally the same `users` table, filtered to `role_id IS NOT NULL`. Consumers (mobile app users) always have `role_id = null`.
- The blanket `admin` middleware (any staff member, any role) gates all of `/admin/*`. Granular enforcement — `permission:{key}` middleware — is applied only to `store`/`update`/`destroy` on roles/personnel/settings/scoring-criteria/Yabeto settings, and to `destroy` on users/transactions/groups/companies; read (`index`/`show`) endpoints stay behind just `admin`. This is a deliberate scope boundary, not every route is permission-gated.
- `POST /admin/verify-password` (`{ password }`, rate-limited) — the back-office calls this as step 2 of every delete confirmation (type the record's name/amount, then re-enter your password) before issuing the actual `DELETE`.

## Cash flow & offline sync

Cash flow is the only offline-first feature (vault and groups are online-only). Mobile reads/writes go through a local `expo-sqlite` database first (`mobile/src/db/database.ts`) — never straight to the network:

- `GET /transactions` / `POST /transactions` (`Api\TransactionController`) — the plain online path, mostly useful for reinstall/multi-device recovery; day-to-day mobile writes don't go through this.
- `POST /sync` (`Api\SyncController`) — batch endpoint the mobile sync engine (`mobile/src/lib/sync.ts`) flushes its local `sync_queue` to on reconnect/foreground/after every new entry. Upserts by `(user_id, uuid)` — client-generated UUIDs mean a retried batch is idempotent rather than duplicating rows. Conflict rule is deliberately dumb: last write for a given UUID wins (mobile has no edit flow, so real conflicts don't happen in practice).
- `transactions` carries `product_name`/`quantity` (nullable) — set when a user picks an item from their product/service catalog (see Products below) instead of typing a category freehand.

## Vault PIN

The vault requires a 4-digit PIN, set on first activation:
- `POST /vault/activate` — `{ pin, pin_confirmation }`, creates the vault and hashes the PIN. 409 if already activated.
- `POST /vault/pin/verify` — `{ pin }`, rate-limited (5/min). `pin_hash` is intentionally excluded from `Vault::$fillable` and never included in JSON responses (`#[Hidden(['pin_hash'])]`).
- `GET /vault` — the vault (balance, `pin_set_at`), or 404 if never activated. The mobile app calls this **before** attempting to unlock, so it can route straight to activation instead of forcing a PIN guess first.
- `GET /vault/movements` — full deposit/withdraw history, most recent first (in-app history + PDF statement export).

### Deposit / withdraw — real Yabeto Pay integration, with a simulated fallback

`POST /vault/deposit` and `POST /vault/withdraw` (`{ amount, pin, payment_method, phone }`, `payment_method` is `mtn_momo` or `airtel_money`) re-verify the PIN, then branch on whether Yabeto Pay is enabled (`Admin\YabetoSettingController`, back-office "Paramètres > Paiements"):

- **Yabeto enabled**: deposit creates+confirms a Payment Intent (`App\Services\Payment\YabetoService`); the balance is only credited once the result is `succeeded` — a `processing` result leaves the `VaultMovement` pending until the `intent.completed` webhook resolves it. Withdraw creates a Disbursement, which Yabeto always returns `processing` for — the balance is debited immediately to reserve the funds and refunded automatically if the webhook later reports `failed`.
- **Yabeto disabled (default)**: the original mocked path — atomically `increment`/`decrement` `vaults.balance` and write a `vault_movements` row inside a `DB::transaction`, noted `"(simulation)"`. No real MTN/Airtel API call.

Either way, withdraw additionally rejects up front if `amount > balance` (422 "Solde insuffisant."). See **Payments** below for the full Yabeto integration.

## Onboarding (company profile)

`companies` is a lightweight profile, not a new ownership boundary — `transactions`/`vault`/`groups` still belong directly to `user_id`. One company per user.
- `POST /onboarding/company` — `{ name, category }` (`category` is one of `Company::CATEGORIES`). 409 if the user already has one. Sets `users.onboarding_completed_at`.
- `GET /me` and the OAuth login responses eager-load `company`, but mobile routing should check the plain `onboarding_completed_at` column, not relation presence — it's always serialized, unlike an unloaded relation.

## Products & services catalog

For commerce/restauration/services companies: a per-user catalog of sellable items (e.g. "Boisson", "Coupe de cheveux"), surfaced during onboarding and referenced from cash flow entries.
- `GET /products`, `POST /products`, `PUT /products/{product}`, `DELETE /products/{product}` (`Api\ProductController`) — `{ name, category, unit_price }`, all scoped to the authenticated user.
- When a mobile transaction references a product, its `name`/`quantity` are copied onto the transaction row (`product_name`/`quantity`) rather than kept as a live foreign key — the transaction should still read correctly if the product is later renamed or deleted.

## Credit scoring (financial identity — the actual product mission)

Loan/credit admissibility for a user is computed live (not cached) by `App\Services\CreditScoreService::calculate()`, exposed at `GET /admin/users/{user}/credit-score` (admin, any user) and `GET /me/credit-score` (mobile, self-service — same service, just resolved against `$request->user()` instead of a route-model-bound `User`, behind plain `auth:sanctum` with no admin gate). It's a **weighted scorecard over a fixed, code-defined catalog of 6 factors** (`ScoringCriteriaSeeder::catalog()` — account age, transaction regularity, savings behavior, income/expense ratio, tontine participation, company profile) — same "fixed catalog, dynamic configuration" pattern as the permission system, not a formula/rule engine.
- Admins retune **weight**, **active/inactive**, and the **band thresholds** (`[{min, max, points}]`, `max: null` = open-ended) per factor from the back-office Settings page (`Admin\ScoringCriterionController@update`, behind `permission:settings.manage`) — they cannot add a factor with a new metric or delete one; that needs code (`CreditScoreService::metricFor()`).
- Weights are normalized across **active** criteria only, so they don't need to sum to exactly 100 — deactivating a factor doesn't skew the score, it's excluded and the rest re-normalize.
- The verdict (Éligible / À examiner / Non éligible) comes from `settings.credit_scoring` (`min_score_eligible`, `min_score_review`), also admin-editable via `PUT /admin/settings`.
- `settings` is a generic key-value store (`Setting` model, `value` JSON) — also backs the Settings page's "Général" tab (platform name/support email). Add new settings sections by seeding a new `key`, not a new table. **Never put secrets in it** — `Admin\SettingController@index` returns every row verbatim to the frontend; that's exactly why Yabeto credentials live in their own dedicated table instead (see Payments).

## Groups (tontines)

`GroupController`: `GET /groups` (the authenticated user's tontines), `POST /groups` (create — name, `contribution_amount`, `frequency`, optional `max_members` participant cap, auto-generates a unique 6-char `invite_code`, creator is attached as the first member), `POST /groups/join` (`{ invite_code }`, 404 if not found, 409 if already a member or the group is at capacity), `GET /groups/{group}` (members + contributions, 403 if the caller isn't a member).
- **Cycle deduplication**: `Group::currentCyclePeriod()` (on the model — shared by the controller, the notification service, and the report service) keys monthly groups by calendar month (`Y-m`) and weekly groups by ISO week (`o-\WW`).
- `show`/`store`/`join` responses are annotated with `current_cycle_period` and `has_paid_current_cycle` (computed for the requesting user, only counting `status = 'succeeded'` contributions) so the mobile client doesn't need to re-derive the cycle logic itself.

### Contributions — 3% management fee, real Yabeto Pay integration

`POST /groups/{group}/contribute` (`{ payment_method, phone }`, both only required when Yabeto is enabled) records a contribution for the current cycle; 409 if the member already has a `succeeded` contribution for it, or a `processing` one still awaiting confirmation.
- A flat **3% management fee** (`GroupController::MANAGEMENT_FEE_RATE`) is withheld from every contribution — `amount` (what the member paid), `fee_amount`, and `net_amount` (what the tontine actually receives) are all stored explicitly on the `Contribution` row for auditability, not computed on the fly at display time.
- **Yabeto enabled**: creates+confirms a Payment Intent exactly like a vault deposit. The `Contribution` row is created immediately regardless of outcome (`status` reflects `succeeded`/`processing`/`failed`) — every "has this member paid" check elsewhere in the codebase (cycle status, notifications, reports) filters `status = 'succeeded'`, so a `processing`/`failed` attempt never counts as paid, and a member can retry after a failure.
- **Yabeto disabled (default)**: the contribution is created with `status: 'succeeded'` immediately — the original mocked instant-paid behavior.
- `GET /groups/{group}/report` (`Api\GroupController@report`, any member) — a live-computed cycle report (`App\Services\TontineReportService`, same "computed, not cached" pattern as credit scoring): totals collected/fees/net, paid vs. late members, per-contribution breakdown. Defaults to the most recently completed cycle; pass `?cycle=2026-07` (or `?cycle=2026-\W29` for weekly groups) for a different one.

## Automated tontine reminders & reports

`App\Services\TontineNotificationService`, driven by two scheduled artisan commands (`routes/console.php`, both `dailyAt`):

- **`tontines:send-reminders`** — for every group, reminds members who haven't paid the current cycle once it's within 3 days of closing (`sendReminders`), then alerts anyone who missed the cycle that just closed plus a summary to the owner (`sendLateAlerts`). Every send is logged to the `notifications` table first, keyed by `(user, group, type, cycle_period)` — that log is what makes re-running the command daily idempotent (it never re-notifies someone already told about the same cycle).
- **`tontines:generate-reports`** — notifies each group's owner once their previous cycle's report is ready to view (`sendCycleReportNotification`), same dedup mechanism.
- Delivery is via **Expo push notifications** (`App\Services\Notifications\ExpoPushService`, posts to `exp.host/--/api/v2/push/send`) using the token registered via `POST /me/push-token` (`users.push_token`, hidden from JSON) — silently no-ops on a non-Expo token and never throws, so a bad token can't break a reminder batch.
- `GET /me/notifications`, `POST /me/notifications/read-all`, `POST /me/notifications/{notification}/read` (`Api\NotificationController`) — the in-app notification list/read-state, backing the mobile Notifications screen.

## Payments — Yabeto Pay integration

Full reference (environments, endpoints, request/response shapes, documented gaps/inconsistencies in Yabeto's own docs) lives in [`yabeto.md`](../yabeto.md) at the repo root — this section is the implementation summary.

- **`App\Services\Payment\`** — `YabetoConfig` (resolves effective config: the admin-managed `yabeto_settings` row first, `.env`/`config/services.php` as fallback), `YabetoClient` (thin HTTP wrapper, base URL per sandbox/live), `YabetoService` (domain methods: `createPaymentIntent`/`confirmPaymentIntent`/`getPaymentIntent`/`createDisbursement`/`getDisbursement`/`listWebhooks`/`registerWebhook`), `YabetoWebhookVerifier` (HMAC-SHA256 signature check), `YabetoRequestException` (thrown on a 4xx/5xx from Yabeto; `userMessage()` turns it into something an admin can actually act on).
- **Credentials are admin-managed, not just `.env`** — `yabeto_settings` is a dedicated single-row table (`App\Models\YabetoSetting`), deliberately **separate** from the generic `settings` key-value store, because `Admin\SettingController@index` returns every settings row verbatim to the frontend; a secret sitting in that table would leak on every Settings page load. `secret_key`/`webhook_secret` use Laravel's `encrypted` cast (APP_KEY-based) and are `#[Hidden]` on the model. `Admin\YabetoSettingController` (`GET/PUT /admin/settings/yabeto`, behind `permission:settings.manage`) only ever reports `has_secret_key`/`has_webhook_secret` booleans, never the values — writes are accepted as a partial payload, so toggling the enabled switch doesn't force re-pasting keys already saved.
- **`POST /admin/settings/yabeto/test-connection`** — a safe read-only call (lists registered webhooks) to confirm the saved credentials actually work, with a distinct error message for "Yabeto rejected the request" (401/403/404, with Yabeto's own error detail when available) vs. "the server couldn't reach Yabeto at all" (DNS/SSL/network — not a credentials problem, and easy to conflate with one).
- **`POST /admin/settings/yabeto/register-webhook`** — registers `POST /webhooks/yabeto` with Yabeto and stores the returned secret. Yabeto only ever returns that secret once; the response is shown to the admin exactly once and never re-served afterward.
- **`POST /webhooks/yabeto`** (`Api\YabetoWebhookController`, public — no `auth:sanctum`, Yabeto isn't one of our users) — verifies the HMAC signature before trusting anything, then resolves whichever `VaultMovement` or `Contribution` the payload's reference matches by `yabeto_reference`, updates its `status`, and finalizes the balance mutation if one is owed (crediting a deposit that just succeeded, or refunding a withdrawal that just failed). Idempotent — a repeated webhook delivery for an already-resolved record is a no-op.
- **Disabled by default** (`yabeto_settings.is_enabled = false` on a fresh seed) — every payment path above falls back to the original simulated instant-success behavior until an admin explicitly turns Yabeto on with real credentials from the back-office. This is deliberate: the seeded demo/dev experience never depends on having a real Yabeto account.

## Structure

- Full data model migrations are in place (`transactions`, `vaults`, `vault_movements`, `groups`, `group_members`, `contributions`, `companies`, `products`, `settings`, `scoring_criteria`, `notifications`, `yabeto_settings`) with models + relationships wired.
- Admin endpoints (`Admin\UserController`, `TransactionController`, `GroupController`, `CompanyController`, `PersonnelController`, `RoleController`, `PermissionController`, `ScoringCriterionController`, `SettingController`, `YabetoSettingController`, `StatsController`) are **fully implemented** (`index`/`show`/`destroy` as applicable), grouped under `/admin` behind the `admin` middleware alias (`App\Http\Middleware\EnsureUserIsAdmin`). They return the full collection with no server-side pagination — the back-office DataTable sorts/filters/paginates client-side, which is fine at seed-scale but would need revisiting at production scale. `Admin\GroupController@index` eager-loads `contributions` (not just the sum) specifically so the back-office dashboard can aggregate/date-filter cotisations without a dedicated endpoint.
- Sensitive endpoints (OAuth login, admin login, PIN verify) are rate-limited via `throttle:*` middleware.
- CORS (`config/cors.php`) is locked to `FRONTEND_URL` (the back-office origin) rather than `*`.
- Admin `destroy` endpoints hard-delete. A real fintech product would soft-delete financial records for audit purposes — out of scope for this MVP but worth revisiting before production.
- `App\Providers\AppServiceProvider` binds `YabetoConfig` as a singleton (`YabetoConfig::resolve()`) — it has scalar constructor params resolved from the database + env, which the container can't autowire on its own.
