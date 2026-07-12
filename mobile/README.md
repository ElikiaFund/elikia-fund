# Elikia Fund — Mobile

Expo (React Native + TypeScript), file-based routing via Expo Router.

## Setup

1. `npm install`
2. `cp .env.example .env` and set `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:8000/api`) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
3. `npx expo start`

**Google and Facebook sign-in require a custom dev client — they do not work in plain Expo Go**, because `@react-native-google-signin/google-signin` and `react-native-fbsdk-next` ship native code. Apple sign-in (`expo-apple-authentication`) does work in Expo Go. To test all three: `npx expo run:ios` / `npx expo run:android`, or an EAS development build.

Before OAuth actually works you need real credentials, filled into `app.json`'s `plugins` (the `REPLACE_WITH_...` placeholders for Google's `iosUrlScheme` and Facebook's `appID`/`clientToken`/`scheme`) and into `.env` (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) and the API's `.env` (`GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, `APPLE_CLIENT_ID`).

## Structure

- `src/app/` — Expo Router screens (file-based). Three-way split via `Stack.Protected` in `src/app/_layout.tsx`: `login.tsx` (unauthenticated) → `onboarding.tsx` (authenticated but no company yet — gated on `user.onboarding_completed_at`, not on relation presence) → `(tabs)/` + `vault-activate.tsx` + `vault-unlock.tsx` (fully onboarded).
- `src/services/apiService.ts` — the single axios instance (base URL, auth header injection, French error normalization). All other services (`authService.ts`, `vaultService.ts`, `companyService.ts`) call through it — don't create a second axios instance.
- `src/context/auth-context.tsx` — session state, backed by `expo-secure-store`. `refreshUser()` re-fetches `/me` — call it after onboarding completes so the `Stack.Protected` guard re-evaluates and routes into the app.
- `src/context/vault-context.tsx` — in-memory "is the vault unlocked right now" flag. It resets every time the Coffre tab loses focus, so the PIN is required on every visit, not just once per app launch.
- `src/db/database.ts` — `expo-sqlite`: `transactions` + `sync_queue` tables (Day 1 data model). Cash flow reads/writes should go through here first, never straight to the network — see `../fintech-mvp-one-week-plan.md`.
- Auth is OAuth-only for end users (no email/password) — `login.tsx` calls the native sign-in SDKs, then exchanges the resulting token with the API (`POST /auth/google|apple|facebook`).
- Onboarding (`onboarding.tsx`) collects a company name + category (fixed list in `companyService.ts`, must match `Company::CATEGORIES` on the API) via `POST /onboarding/company`. One company per user, mobile-only flow — the back-office manages companies separately, read/delete only.
- Vault access requires a 4-digit PIN, set on first activation (`vault-activate.tsx`) and re-entered on every subsequent visit (`vault-unlock.tsx`) — mirrors the API's `POST /vault/activate` / `POST /vault/pin/verify`.
- Cashflow/Vault/Groups screens are placeholder stubs (`// TODO (Day N): ...`) — see `../fintech-mvp-one-week-plan.md` for what each one should do.

All screen copy is in French.
