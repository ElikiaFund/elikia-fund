# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A monorepo for the Elikia Fund fintech MVP: an offline-first cash flow tracker, a savings vault, and group savings circles ("tontines"), built as three independent apps talking to one Laravel API. The sprint scope, day-by-day plan, and cut list live in [`fintech-mvp-one-week-plan.md`](fintech-mvp-one-week-plan.md) — read it before making product/scope decisions; it is the source of truth for what's in vs. out of scope for the current sprint, not this file.

```
api/           Laravel 13 + Sanctum + MySQL
mobile/        Expo (React Native + TypeScript) — end-user app
back-office/   Vite + React + shadcn/ui — admin app
website/       Not started (Week 2+)
```

Each app has its own `README.md` with setup steps — this file covers cross-cutting architecture and commands.

## Commands

### api/ (Laravel)
```
composer install
cp .env.example .env && php artisan key:generate
php artisan migrate:fresh --seed  # seeds an admin + ~30 realistic users/transactions/companies/tontines
php artisan serve                 # http://localhost:8000/api

php artisan route:list --path=api # inspect registered routes
./vendor/bin/pint                 # format (run before committing PHP changes)
php artisan test                  # or: ./vendor/bin/phpunit
php artisan test --filter=TestName
```

### mobile/ (Expo)
```
npm install
cp .env.example .env
npx expo start

npx tsc --noEmit                  # type-check
npx expo lint
npx expo-doctor                   # validates SDK/plugin config
```
Google and Facebook sign-in require a custom dev client (`npx expo run:ios` / `run:android`, or an EAS dev build) — they don't work in plain Expo Go, because `@react-native-google-signin/google-signin` and `react-native-fbsdk-next` ship native code. Apple sign-in works in Expo Go.

### back-office/ (Vite + React)
```
npm install
cp .env.example .env
npm run dev

npx tsc -b                        # type-check
npm run build                     # tsc -b && vite build
npm run lint                      # oxlint
```

## Architecture

### Auth is split by app, not shared
- **Mobile (end users): OAuth only, no passwords.** `POST /auth/google|apple|facebook` on the API. Each verifies the provider token server-side (`api/app/Services/SocialAuthService.php`) and finds-or-creates the `User` by provider id, falling back to email match. The Apple flow **decodes the identity token without verifying its signature** — see the `TODO` in `SocialAuthService::decodeAppleToken()` before shipping (needs JWKS verification via `firebase/php-jwt`).
- **Back office (admins): email + password.** `POST /admin/login`, rejected unless `users.is_admin` is true. Admins are seeded (`database/seeders/DatabaseSeeder.php`), never self-registered.
- Both flows land on the same `users` table and issue Sanctum personal access tokens; `POST /logout` and `GET /me` work for either caller.
- Mobile and back-office each have their own `src/services/apiService.ts` — a single axios instance per app (base URL + bearer token injection + French error normalization). New API calls go through it; don't spin up a second axios instance in either app.

### Vault PIN
The vault requires a 4-digit PIN, set on first activation, not just a one-time gate:
- `POST /vault/activate` creates the vault and hashes the PIN (`Hash::make`, stored in `vaults.pin_hash`).
- `POST /vault/pin/verify` re-checks the PIN and is rate-limited (5/min) — the mobile Coffre tab calls this **every time it regains focus** (`src/context/vault-context.tsx` resets `isUnlocked` on blur), not just once per session.
- `pin_hash` is deliberately excluded from `Vault::$fillable` (set via direct attribute assignment only) and from JSON output (`#[Hidden(['pin_hash'])]`) — never make it mass-assignable or serializable.
- Day 2's `deposit`/`withdraw` implementations must re-verify the PIN before moving money (see the `TODO`s in `VaultController`).

### Offline-first cash flow (mobile)
Cash flow is the only offline-first feature (vault and groups are online-only, per the sprint plan). `mobile/src/db/database.ts` owns a local `expo-sqlite` database with `transactions` and `sync_queue` tables — reads/writes go through this module first, never straight to the network. Sync strategy (Day 4, not yet built): flush `sync_queue` to `POST /sync` in batches on reconnect, last-write-wins by timestamp, client-generated UUIDs so offline records never collide.

### Data model
`users` (with `is_admin`, nullable `password`, nullable `google_id`/`apple_id`/`facebook_id`, nullable `onboarding_completed_at`), `companies`, `transactions`, `vaults` (+ `vault_movements`), `groups` (+ `group_members`, `contributions`). Full relationships are wired on the Eloquent models in `api/app/Models/`. `sync_queue` is mobile-local only, not an API table.

### Company = lightweight profile, not a new ownership boundary
A user configures one `Company` (name + fixed-list `category`, see `Company::CATEGORIES`) during a post-login onboarding step on mobile. This is deliberately **not** a multi-tenant pivot: `transactions`/`vault`/`groups` still belong directly to `user_id`, exactly as before — `companies` is just a profile row with a `user_id` owner. One company per user (`users.company_id` doesn't exist; it's `companies.user_id` unique).
- API: `POST /onboarding/company` (`App\Http\Controllers\Api\OnboardingController`), sets `users.onboarding_completed_at`.
- Mobile: routing checks the plain `onboarding_completed_at` column (always serialized), not `company` relation presence (only eager-loaded on `/me` and OAuth login responses — omitted entirely from JSON when not loaded, which would silently break a presence check).
- Back-office: full CRUD-list (read/delete) at `/entreprises`, independent of mobile's onboarding flow.
- If `Company::CATEGORIES` changes, update it in three places: `api/app/Models/Company.php`, `mobile/src/services/companyService.ts`, `back-office/src/lib/company-categories.ts`.

### Admin endpoints are real; mobile-facing Day 2+ endpoints are still stubs
`Admin\*` controllers (`UserController`, `TransactionController`, `GroupController`, `CompanyController`, `StatsController`) are fully implemented — the back-office needs real data, so these moved out of TODO status. They return the full collection with no server-side pagination/filtering; the back-office's DataTable (see below) sorts/filters/paginates client-side, which is fine at seed-scale but would need revisiting for production. Mobile-facing Day 2+ business logic (`TransactionController@store`, `VaultController@show/deposit/withdraw`, `GroupController@store/join/contribute`, `SyncController`) is still routed and scaffolded but left as `// TODO (Day N): ...` — implement these by following the day-by-day plan in `fintech-mvp-one-week-plan.md`, not by guessing.

### Back-office admin DataTable
`back-office/src/components/data-table/` is one reusable table (TanStack Table + shadcn) used by all four list pages (`users`, `transactions`, `groups`, `companies`): sorting, dynamic column visibility, Airtable-style per-column faceted filters, global search, pagination, row actions, and bulk actions — delete always goes through an `AlertDialog` confirmation (`row-actions.tsx` / `bulk-delete-button.tsx`), never immediate. A page just defines `ColumnDef[]` (starting with `createSelectColumn()`) and a `facetedFilters` config, fetches its list via `back-office/src/services/adminService.ts`, and renders `<DataTable>` — see `src/pages/users.tsx` for the shortest example before building a new admin list page from scratch.

### Language
All mobile and back-office UI copy is in French. API error messages returned to clients are also in French; internal code comments and identifiers stay in English.
