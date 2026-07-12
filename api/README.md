# Elikia Fund — API

Laravel 13 + Sanctum (bearer tokens) + MySQL.

## Setup

1. Create a local MySQL database named `elikia_fund`.
2. `composer install`
3. `cp .env.example .env` and fill in `DB_USERNAME` / `DB_PASSWORD` for your MySQL install, plus `GOOGLE_CLIENT_ID` / `FACEBOOK_APP_ID` / `APPLE_CLIENT_ID` once you have them (see Auth below).
4. `php artisan key:generate`
5. `php artisan migrate --seed` (seeds one back-office admin: `admin@elikia-fund.test` / `password` — dev only, change before deploying)
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

## Structure

- Day 1 data model migrations are in place for the full schema (`transactions`, `vaults`, `vault_movements`, `groups`, `group_members`, `contributions`) with models + relationships wired.
- Day 2+ endpoints (`TransactionController`, `SyncController`, `VaultController@show/deposit/withdraw`, `GroupController`, `Admin\*`) are routed and controller methods exist but are unimplemented (`// TODO (Day N): ...`) — see `../fintech-mvp-one-week-plan.md` for what each one should do.
- Admin-only routes are grouped under `/admin` behind the `admin` middleware alias (`App\Http\Middleware\EnsureUserIsAdmin`, checks `users.is_admin`).
- Sensitive endpoints (OAuth login, admin login, PIN verify) are rate-limited via `throttle:*` middleware.
- CORS (`config/cors.php`) is locked to `FRONTEND_URL` (the back-office origin) rather than `*`.
