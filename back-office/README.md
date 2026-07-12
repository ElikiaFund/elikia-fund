# Elikia Fund — Back office

Vite + React + TypeScript + shadcn/ui (Radix base, Nova preset) + Tailwind CSS v4.

## Setup

1. `npm install`
2. `cp .env.example .env` and set `VITE_API_URL` (defaults to `http://localhost:8000/api`).
3. Seed the API (`cd ../api && php artisan migrate:fresh --seed`) so there's real data to look at.
4. `npm run dev`

Log in with the seeded admin (`admin@elikia-fund.test` / `password`, see `../api/README.md`).

## Structure

- `src/services/apiService.ts` — the single axios instance (base URL, auth header injection, French error normalization). `authService.ts`/`adminService.ts` call through it — same pattern as the mobile app.
- `src/context/auth-context.tsx` — admin session, token in `localStorage`. Auth is email + password only (`POST /admin/login`), rejected server-side unless the account is an admin — no self-registration.
- `src/components/layout/protected-route.tsx` + `app-layout.tsx` — route guard and the shadcn `dashboard-01` shell (`AppSidebar` + `SiteHeader`), applied to every authenticated page and **not** the `/connexion` route. Nav items live in `src/components/nav-config.ts` (single source of truth for both the sidebar and the header's page title).
- `src/pages/` — routed pages: `login`, `dashboard`, `users`, `transactions`, `groups`, `companies`. Routes are wired in `src/App.tsx`:
  - `/connexion` — login (public)
  - `/` — Tableau de bord (dashboard)
  - `/utilisateurs` — Utilisateurs (users)
  - `/transactions` — Transactions
  - `/tontines` — Tontines (groups)
  - `/entreprises` — Entreprises (companies)
- `src/components/data-table/` — the reusable admin table, used by all four list pages. `data-table.tsx` owns TanStack Table state (sorting, column visibility, row selection, global search, pagination); `toolbar.tsx`, `faceted-filter.tsx` (Airtable-style multi-select column filters), `column-header.tsx` (sort/hide dropdown), `pagination.tsx`, `row-actions.tsx` + `bulk-delete-button.tsx` (delete with an `AlertDialog` confirmation, single-row or bulk via `Promise.all`) are its pieces. A page defines `ColumnDef[]` (spreading `createSelectColumn()` first) and a `facetedFilters` config, fetches its list from `adminService`, and renders `<DataTable>` — see `src/pages/users.tsx` for the shortest example.
- Filtering/sorting/pagination is all **client-side** — the admin endpoints return the full collection, no server-side query params. Fine at seed-scale; would need revisiting at production scale (see `../api/README.md`).
- `src/pages/dashboard.tsx` + `src/components/dashboard/` — fetches users/transactions/groups via `adminService`, maps them into the plain shapes in `src/components/dashboard/types.ts`, then reuses the same stat cards / charts / tables that used to run on mock data. The "cotisations par tontine" chart and the `Admin\GroupController@index` eager-loading of `contributions` (not just the sum) exist specifically to support this without a dedicated endpoint.
- Company categories (`src/lib/company-categories.ts`) must stay in sync with `Company::CATEGORIES` on the API and `COMPANY_CATEGORIES` in the mobile app.
- Mobile-facing Day 2+ business logic (transaction/vault/group CRUD) has no back-office equivalent yet — those pages only manage what's already recorded (list, filter, delete), matching what the API actually implements.

All UI copy is in French.
