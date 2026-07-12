# Elikia Fund — API

Laravel 13 + Sanctum (bearer tokens) + MySQL.

## Setup

1. Create a local MySQL database named `elikia_fund`.
2. `composer install`
3. `cp .env.example .env` and fill in `DB_USERNAME` / `DB_PASSWORD` for your MySQL install, plus `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID` / `APPLE_CLIENT_ID` once you have them (see Auth below).
4. `php artisan key:generate`
5. `php artisan migrate:fresh --seed` (seeds one back-office admin — `admin@elikia-fund.test` / `password`, dev only — plus ~30 realistic users with transactions, vaults, companies, and 5 tontines with contributions; `APP_FAKER_LOCALE=fr_FR` gives French names)
6. `php artisan serve`

API is served at `http://localhost:8000/api`.

## Auth

Two separate auth flows share the same `users` table and Sanctum tokens:

- **Mobile app (end users)** — OAuth only, no passwords: `POST /auth/google`, `/auth/apple`, `/auth/facebook`. Each verifies the provider token server-side (`App\Services\SocialAuthService`) and finds-or-creates the user by provider id / email. **The Apple flow decodes the identity token's payload without verifying its signature** — see the `TODO` in `SocialAuthService::decodeAppleToken()` for what's needed before production (JWKS signature verification via `firebase/php-jwt`).
- **Back office (admins)** — classic email + password: `POST /admin/login`, rejected unless `users.is_admin` is true. Admins are created via the seeder, not self-registration.
- Both flows issue a Sanctum personal access token; `POST /logout` and `GET /me` work for either.

## Vault PIN

The vault requires a 4-digit PIN, set on first activation:
- `POST /vault/activate` — `{ pin, pin_confirmation }`, creates the vault and hashes the PIN. 409 if already activated.
- `POST /vault/pin/verify` — `{ pin }`, rate-limited (5/min). `pin_hash` is intentionally excluded from `Vault::$fillable` and never included in JSON responses (`#[Hidden(['pin_hash'])]`).
- Day 2's `deposit`/`withdraw` implementations must re-verify the PIN before moving money — see the `TODO`s in `VaultController`.

## Onboarding (company profile)

`companies` is a lightweight profile, not a new ownership boundary — `transactions`/`vault`/`groups` still belong directly to `user_id`. One company per user.
- `POST /onboarding/company` — `{ name, category }` (`category` is one of `Company::CATEGORIES`). 409 if the user already has one. Sets `users.onboarding_completed_at`.
- `GET /me` and the OAuth login responses eager-load `company`, but mobile routing should check the plain `onboarding_completed_at` column, not relation presence — it's always serialized, unlike an unloaded relation.

## Structure

- Full data model migrations are in place (`transactions`, `vaults`, `vault_movements`, `groups`, `group_members`, `contributions`, `companies`) with models + relationships wired.
- Mobile-facing Day 2+ endpoints (`TransactionController`, `SyncController`, `VaultController@show/deposit/withdraw`, `GroupController@store/join/contribute`) are routed and controller methods exist but are unimplemented (`// TODO (Day N): ...`) — see `../fintech-mvp-one-week-plan.md` for what each one should do.
- Admin endpoints (`Admin\UserController`, `TransactionController`, `GroupController`, `CompanyController`, `StatsController`) are **fully implemented** (`index`/`show`/`destroy`), grouped under `/admin` behind the `admin` middleware alias (`App\Http\Middleware\EnsureUserIsAdmin`, checks `users.is_admin`). They return the full collection (no server-side pagination) — the back-office DataTable sorts/filters/paginates client-side, which is fine at seed-scale but would need revisiting at production scale. `Admin\GroupController@index` eager-loads `contributions` (not just the sum) specifically so the back-office dashboard can aggregate/date-filter cotisations without a dedicated endpoint.
- Sensitive endpoints (OAuth login, admin login, PIN verify) are rate-limited via `throttle:*` middleware.
- CORS (`config/cors.php`) is locked to `FRONTEND_URL` (the back-office origin) rather than `*`.
- Admin `destroy` endpoints hard-delete. A real fintech product would soft-delete financial records for audit purposes — out of scope for this MVP but worth revisiting before production.
