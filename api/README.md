# Elikia Fund — API

Laravel 13 + Sanctum (bearer tokens) + MySQL.

## Setup

1. Create a local MySQL database named `elikia_fund`.
2. `composer install`
3. `cp .env.example .env` and fill in `DB_USERNAME` / `DB_PASSWORD` for your MySQL install, plus `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID` / `APPLE_CLIENT_ID` once you have them (see Auth below).
4. `php artisan key:generate`
5. `php artisan migrate:fresh --seed` (seeds two staff logins — `admin@elikia-fund.test` / `password` with the Super Admin role, `support@elikia-fund.test` / `password` with the read-only Support role, both dev only — plus ~30 realistic consumer users with transactions, vaults, companies, and 5 tontines with contributions; `APP_FAKER_LOCALE=fr_FR` gives French names)
6. `php artisan storage:link` (serves uploaded avatars from `storage/app/public`)
7. `php artisan serve`

API is served at `http://localhost:8000/api`.

## Auth

Two separate auth flows share the same `users` table and Sanctum tokens:

- **Mobile app (end users)** — OAuth (`POST /auth/google`, `/auth/apple`, `/auth/facebook`) or email/password (`POST /auth/register`, `/auth/login`). OAuth verifies the provider token server-side (`App\Services\SocialAuthService`) and finds-or-creates the user by provider id / email. **The Apple flow decodes the identity token's payload without verifying its signature** — see the `TODO` in `SocialAuthService::decodeAppleToken()` for what's needed before production (JWKS signature verification via `firebase/php-jwt`). `register` rejects a duplicate email outright rather than attaching a password to an existing OAuth account by email match (that would be an account-takeover vector — anyone who knows a victim's email could hijack their account); linking a password onto an OAuth account is only possible authenticated, via `PUT /me`.
- **Back office (staff)** — classic email + password: `POST /admin/login`, rejected unless the account has a `role_id`. Staff are created via the seeder or the Personnel page, not self-registration.
- Both flows issue a Sanctum personal access token; `POST /logout` and `GET /me` work for either. `PUT /me` (update name/email/password) and `POST /me/avatar` (multipart upload) work for either too.

## Roles & permissions

`is_admin` is now a **computed** attribute (`role_id !== null`), not a column — kept as a real JSON field via `$appends` so existing consumers (mobile, back-office) didn't need to change. The actual source of truth is `users.role_id` → `roles` → `permission_role` → `permissions`.
- The permission catalog (`PermissionSeeder::catalog()`) is fixed/code-defined, not user-creatable — 12 keys across 6 groups (`users.*`, `transactions.*`, `groups.*`, `companies.*`, `personnel.*`, `roles.*`, each `.view`/`.delete` or `.manage`).
- Roles are fully custom: `Admin\RoleController` CRUDs a role's name + its permission set (`permission_role` sync).
- `Admin\PersonnelController` manages **internal staff** — literally the same `users` table, filtered to `role_id IS NOT NULL`. Consumers (mobile app users) always have `role_id = null`.
- The blanket `admin` middleware (any staff member, any role) still gates all of `/admin/*`, same as before. Granular enforcement — `permission:{key}` middleware — is applied only to `store`/`update`/`destroy` on roles/personnel and to `destroy` on users/transactions/groups/companies; read (`index`/`show`) endpoints stay behind just `admin`. Wiring `permission:*` into every read route was a deliberate scope cut, not an oversight.
- `POST /admin/verify-password` (`{ password }`, rate-limited) — the back-office calls this as step 2 of every delete confirmation (type the record's name/amount, then re-enter your password) before issuing the actual `DELETE`.

## Vault PIN

The vault requires a 4-digit PIN, set on first activation:
- `POST /vault/activate` — `{ pin, pin_confirmation }`, creates the vault and hashes the PIN. 409 if already activated.
- `POST /vault/pin/verify` — `{ pin }`, rate-limited (5/min). `pin_hash` is intentionally excluded from `Vault::$fillable` and never included in JSON responses (`#[Hidden(['pin_hash'])]`).
- `GET /vault` — the vault (balance, `pin_set_at`), or 404 if never activated. The mobile app calls this **before** attempting to unlock, so it can route straight to activation instead of forcing a PIN guess first.

### Deposit / withdraw — staged, not a real mobile money integration

`POST /vault/deposit` and `POST /vault/withdraw` (`{ amount, pin, payment_method }`, `payment_method` is `mtn_momo` or `airtel_money`) are **real as far as this app's own state goes** — they re-verify the PIN (`Hash::check` against `vault.pin_hash`, same as `pin/verify`), then atomically `increment`/`decrement` `vaults.balance` and write a `vault_movements` row (`DB::transaction`) inside `VaultController`. Withdraw additionally rejects if `amount > balance` (422 "Solde insuffisant.").

What's **not** real: there is no MTN Mobile Money or Airtel Money API call anywhere. `payment_method` is only used to pick a human-readable label (`VaultController::PAYMENT_METHOD_LABELS`) stored on the movement's `note` (e.g. "Dépôt via MTN Mobile Money (simulation)."). The mobile client is honest about this too — the payment-method selection screen is real UI, but no request ever leaves the app to an actual telecom aggregator. Wiring up real MTN MoMo / Airtel Money integration is Week 2+ scope (see `fintech-mvp-one-week-plan.md` §7) — when that happens, `deposit`/`withdraw` are the two methods to replace the mocked balance mutation with an actual payment-gateway call + webhook/callback confirmation, ideally moving the balance update to only happen once the gateway confirms success rather than synchronously as it does now.

## Onboarding (company profile)

`companies` is a lightweight profile, not a new ownership boundary — `transactions`/`vault`/`groups` still belong directly to `user_id`. One company per user.
- `POST /onboarding/company` — `{ name, category }` (`category` is one of `Company::CATEGORIES`). 409 if the user already has one. Sets `users.onboarding_completed_at`.
- `GET /me` and the OAuth login responses eager-load `company`, but mobile routing should check the plain `onboarding_completed_at` column, not relation presence — it's always serialized, unlike an unloaded relation.

## Credit scoring (financial identity)

Loan/credit admissibility for a user is computed live (not cached) by `App\Services\CreditScoreService::calculate()`, exposed at `GET /admin/users/{user}/credit-score` (admin, any user) and `GET /me/credit-score` (mobile, self-service — same service, just resolved against `$request->user()` instead of a route-model-bound `User`, behind plain `auth:sanctum` with no admin gate). It's a **weighted scorecard over a fixed, code-defined catalog of 6 factors** (`ScoringCriteriaSeeder::catalog()` — account age, transaction regularity, savings behavior, income/expense ratio, tontine participation, company profile) — same "fixed catalog, dynamic configuration" pattern as the permission system, not a formula/rule engine.
- Admins retune **weight**, **active/inactive**, and the **band thresholds** (`[{min, max, points}]`, `max: null` = open-ended) per factor from the back-office Settings page (`Admin\ScoringCriterionController@update`, behind `permission:settings.manage`) — they cannot add a factor with a new metric or delete one; that needs code (`CreditScoreService::metricFor()`).
- Weights are normalized across **active** criteria only, so they don't need to sum to exactly 100 — deactivating a factor doesn't skew the score, it's excluded and the rest re-normalize.
- The verdict (Éligible / À examiner / Non éligible) comes from `settings.credit_scoring` (`min_score_eligible`, `min_score_review`), also admin-editable via `PUT /admin/settings`.
- `settings` is a generic key-value store (`Setting` model, `value` JSON) — also backs the Settings page's "Général" tab (platform name/support email). Add new settings sections by seeding a new `key`, not a new table.

## Groups (tontines)

`GroupController` is fully implemented: `GET /groups` (the authenticated user's tontines), `POST /groups` (create — name, `contribution_amount`, `frequency`, auto-generates a unique 6-char `invite_code` via `Str::random`, creator is attached as the first member), `POST /groups/join` (`{ invite_code }`, 404 if not found, 409 if already a member), `GET /groups/{group}` (members + contributions, 403 if the caller isn't a member), `POST /groups/{group}/contribute` (mock contribution — no real payment, just records a `Contribution` row; 409 if the user already contributed for the current cycle).
- **Cycle deduplication**: `GroupController::currentCyclePeriod()` keys monthly groups by calendar month (`Y-m`) and weekly groups by ISO week (`o-\WW`) — `contribute()` checks for an existing `Contribution` matching that period before allowing another, so a member can't double-pay the same cycle by mistake.
- `show`/`store`/`join` responses are annotated with `current_cycle_period` and `has_paid_current_cycle` (computed for the requesting user) so the mobile client doesn't need to re-derive the cycle logic itself to render contribution status.

## Structure

- Full data model migrations are in place (`transactions`, `vaults`, `vault_movements`, `groups`, `group_members`, `contributions`, `companies`, `settings`, `scoring_criteria`) with models + relationships wired.
- Mobile-facing Day 2+ endpoints: `VaultController` and `GroupController` are now fully implemented (see their sections above). `TransactionController`/`SyncController` are still routed stubs (`// TODO (Day N): ...`) — cash flow is currently offline-only via the mobile app's local SQLite (`mobile/src/db/database.ts`), with no server sync yet — see `../fintech-mvp-one-week-plan.md` for what each one should do.
- Admin endpoints (`Admin\UserController`, `TransactionController`, `GroupController`, `CompanyController`, `StatsController`) are **fully implemented** (`index`/`show`/`destroy`), grouped under `/admin` behind the `admin` middleware alias (`App\Http\Middleware\EnsureUserIsAdmin`, checks `users.is_admin`). They return the full collection (no server-side pagination) — the back-office DataTable sorts/filters/paginates client-side, which is fine at seed-scale but would need revisiting at production scale. `Admin\GroupController@index` eager-loads `contributions` (not just the sum) specifically so the back-office dashboard can aggregate/date-filter cotisations without a dedicated endpoint.
- Sensitive endpoints (OAuth login, admin login, PIN verify) are rate-limited via `throttle:*` middleware.
- CORS (`config/cors.php`) is locked to `FRONTEND_URL` (the back-office origin) rather than `*`.
- Admin `destroy` endpoints hard-delete. A real fintech product would soft-delete financial records for audit purposes — out of scope for this MVP but worth revisiting before production.
