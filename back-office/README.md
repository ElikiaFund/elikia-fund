# Elikia Fund — Back office

Vite + React + TypeScript + shadcn/ui (Radix base, Nova preset) + Tailwind CSS v4.

## Setup

1. `npm install`
2. `cp .env.example .env` and set `VITE_API_URL` (defaults to `http://localhost:8000/api`).
3. `npm run dev`

Log in with the seeded admin (`admin@elikia-fund.test` / `password`, see `../api/README.md`).

## Structure

- `src/services/apiService.ts` — the single axios instance (base URL, auth header injection, French error normalization). `authService.ts` calls through it — same pattern as the mobile app.
- `src/context/auth-context.tsx` — admin session, token in `localStorage`. Auth is email + password only (`POST /admin/login`), rejected server-side unless the account is an admin — no self-registration.
- `src/components/layout/protected-route.tsx` + `app-layout.tsx` — route guard and the shadcn `dashboard-01` shell (`AppSidebar` + `SiteHeader`), applied to every authenticated page and **not** the `/connexion` route. Nav items live in `src/components/nav-config.ts` (single source of truth for both the sidebar and the header's page title).
- `src/pages/` — routed pages: `login`, `dashboard`, `users`, `transactions`, `groups`. Routes are wired in `src/App.tsx`:
  - `/connexion` — login (public)
  - `/` — Tableau de bord (dashboard)
  - `/utilisateurs` — Utilisateurs (users)
  - `/transactions` — Transactions
  - `/tontines` — Tontines (groups)
- All pages beyond login are placeholder stubs (`// TODO (Day 6): ...`) pointed at the corresponding `/admin/*` endpoints, which are themselves unimplemented on the API side — see `../fintech-mvp-one-week-plan.md`.

All UI copy is in French.
