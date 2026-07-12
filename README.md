# Elikia Fund

Fintech MVP: mobile app (React Native/Expo), back office (React), and API (Laravel). See [`fintech-mvp-one-week-plan.md`](fintech-mvp-one-week-plan.md) for the sprint scope and day-by-day plan.

## Structure

| App | Stack | Docs |
|---|---|---|
| [`api/`](api) | Laravel 13 + Sanctum + MySQL | [`api/README.md`](api/README.md) |
| [`mobile/`](mobile) | Expo (React Native + TypeScript) | [`mobile/README.md`](mobile/README.md) |
| [`back-office/`](back-office) | Vite + React + shadcn/ui | [`back-office/README.md`](back-office/README.md) |
| [`website/`](website) | Not started — Week 2+ | [`website/README.md`](website/README.md) |

## Quick start

1. **API** — create a local MySQL database, then follow [`api/README.md`](api/README.md). Serves at `http://localhost:8000/api`.
2. **Mobile** — follow [`mobile/README.md`](mobile/README.md). Google/Facebook sign-in need a custom dev client, not Expo Go.
3. **Back office** — follow [`back-office/README.md`](back-office/README.md). Log in with the seeded admin account.

All mobile and back-office UI copy is in French.
