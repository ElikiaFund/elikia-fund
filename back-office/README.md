# Elikia Fund — Back office

Vite + React + TypeScript + shadcn/ui (Radix base, Nova preset) + Tailwind CSS v4.

## Setup

1. `npm install`
2. `cp .env.example .env` and set `VITE_API_URL` (defaults to `http://localhost:8000/api`).
3. Seed the API (`cd ../api && php artisan migrate:fresh --seed && php artisan storage:link`) so there's real data to look at and avatar uploads work.
4. `npm run dev`

Log in with a seeded staff account (see `../api/README.md`): `admin@elikia-fund.test` / `password` (Super Admin) or `support@elikia-fund.test` / `password` (read-only Support role, useful for testing permission gating).

## Structure

- `src/services/apiService.ts` — the single axios instance (base URL, auth header injection, French error normalization). `authService.ts`/`adminService.ts` call through it — same pattern as the mobile app.
- `src/context/auth-context.tsx` — admin session, token in `localStorage`. Auth is email + password only (`POST /admin/login`), rejected server-side unless the account has a role — no self-registration. `updateUser()` lets pages (Profile) patch the cached user after an edit without a full re-fetch.
- `src/components/layout/protected-route.tsx` + `app-layout.tsx` — route guard and the shadcn `dashboard-01` shell (`AppSidebar` + `SiteHeader`), applied to every authenticated page and **not** the `/connexion` route. Nav items live in `src/components/nav-config.ts` (single source of truth for both the sidebar and the header's page title).
- `src/pages/` — routed pages, wired in `src/App.tsx`:
  - `/connexion` — login (public)
  - `/` — Tableau de bord (dashboard)
  - `/utilisateurs` (+ `/utilisateurs/:id` detail — Informations/Score de crédit/Transactions/Analytique tabs, all sharing one page-level date-range filter)
  - `/transactions`
  - `/tontines` (+ `/tontines/:id` detail — Informations/Membres/Transactions/Analytique tabs)
  - `/entreprises` (+ `/entreprises/:id` detail — single info view, no tabs, no transactions by design: a company is a lightweight profile, not a data owner)
  - `/personnel` — Personnels / Rôles & Permissions tabs (internal staff + custom RBAC management)
  - `/parametres` — Général / Notation de crédit tabs (platform settings + the credit-scoring algorithm's weights/thresholds)
  - `/profil` — My Profile (avatar upload, name/email, password change)
- `src/components/data-table/` — the reusable admin table, used by all list pages (Users/Transactions/Groups/Companies/Personnel). `data-table.tsx` owns TanStack Table state (sorting, column visibility, row selection, global search, pagination); `toolbar.tsx`, `faceted-filter.tsx` (Airtable-style multi-select column filters), `column-header.tsx` (sort/hide dropdown), `pagination.tsx` are its pieces. A page defines `ColumnDef[]` (spreading `createSelectColumn()` first) and a `facetedFilters` config, fetches its list from `adminService`, and renders `<DataTable getRowHref={...}>` — see `src/pages/users.tsx` for the shortest example. **Rows are clickable** (navigate to `getRowHref`); the `select` and `actions` cells stop click propagation so checking a row or opening its menu doesn't also navigate — there is no "Voir les détails" row action, don't re-add one.
- **Deletion is a two-step, step-up-authenticated confirmation** (`data-table/confirm-delete-dialog.tsx`, used by both `row-actions.tsx` and `bulk-delete-button.tsx`): type the record's name/amount (or the fixed keyword `SUPPRIMER` for bulk) to enable "Continuer", then re-enter your own password — verified via `POST /admin/verify-password` — before the actual `DELETE` fires. Don't build a new delete flow that skips this; reuse `ConfirmDeleteDialog`.
- Filtering/sorting/pagination is all **client-side** — the admin endpoints return the full collection, no server-side query params. Fine at seed-scale; would need revisiting at production scale (see `../api/README.md`).
- `src/pages/dashboard.tsx` + `src/components/dashboard/` — fetches users/transactions/groups via `adminService`, maps them into the plain shapes in `src/components/dashboard/types.ts`, then reuses the same stat cards / charts / tables that used to run on mock data. The "cotisations par tontine" chart and the `Admin\GroupController@index` eager-loading of `contributions` (not just the sum) exist specifically to support this without a dedicated endpoint — the user/group detail pages' Analytique tabs reuse the same components and the same trick.
- `src/components/personnel/` — the Personnel page's two tabs: `personnel-tab.tsx` (staff DataTable + add/edit/delete) and `roles-tab.tsx` (role cards + create/edit/delete), sharing `personnel-form-dialog.tsx` / `role-form-dialog.tsx`. Roles/permissions are fully custom (create a role, check which permissions it grants) — the permission catalog itself is fixed/code-defined on the API (`PermissionSeeder`), not editable from the UI.
- `src/components/settings/` — the Settings page's tabs: `general-tab.tsx` (platform name/support email) and `credit-scoring-tab.tsx` (admissibility thresholds + the 6 scoring-criteria cards, each editable via `criterion-form-dialog.tsx` — weight, active toggle, and a band editor for the `[{min, max, points}]` thresholds). Like permissions, the criteria themselves are a fixed catalog (`ScoringCriteriaSeeder` on the API) — this UI can retune them, not create new ones.
- `src/components/user-detail/` — `user-detail.tsx`'s tab contents: `informations-tab.tsx`, `credit-score-tab.tsx` (score + verdict + full breakdown table, fetched from `adminService.getCreditScore`), `transactions-tab.tsx` (adds its own type facet on top of the page-level date range), `analytics-tab.tsx` (stat row + `TransactionsChart` + the new `UsageChart` — transaction count per day, a rough engagement signal — + `TontinesChart` reused for category breakdown).
- `src/components/dashboard/tontines-chart.tsx` is a generic ranked-bar-chart component reused three times now (dashboard cotisations-per-tontine, group-detail cotisations-per-member, user-detail spend-per-category) — its `tontine` field name is a historical leftover, not semantic; always pass `title`/`description` when reusing it for something else.
- Company categories (`src/lib/company-categories.ts`) must stay in sync with `Company::CATEGORIES` on the API and `COMPANY_CATEGORIES` in the mobile app.
- Mobile-facing Day 2+ business logic (transaction/vault/group CRUD) has no back-office equivalent yet — those pages only manage what's already recorded (list, filter, delete), matching what the API actually implements.

All UI copy is in French.
