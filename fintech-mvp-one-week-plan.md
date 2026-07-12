# Fintech MVP — One-Week Solo Sprint Plan

**Sprint dates:** Friday, July 10 — Friday, July 17, 2026 (7 days)
**Team:** 1 developer (solo)
**Sprint goal:** Ship a working MVP of the mobile app (offline cash flow tracker, savings vault, group circles with mocked payments) and a functional React back office, both talking to a deployed Laravel API.

---

## 1. Scope Summary

### In scope (Week 1)
| Deliverable | Core features |
|---|---|
| **Mobile app** (React Native) | Auth, cash flow tracker (full offline + sync), savings vault (online, cached read offline), group circles (online only), mocked payment button |
| **Back office** (React web) | Admin auth, user list/detail, transactions overview, groups overview, basic vault stats |
| **Backend** (Laravel API) | Auth (Sanctum), all CRUD endpoints, sync endpoint, seeded MySQL DB, deployed |

### Explicitly OUT of scope (Week 2+)
- Real mobile money integration (MTN MoMo / Orange Money) — mock button only
- Website / landing page
- Push notifications
- Offline support for groups
- Advanced admin analytics, exports, role management
- App store submission polish (this week = installable build / TestFlight-style distribution)

---

## 2. Architecture Decisions (locked — don't revisit mid-week)

- **Backend:** Laravel API + Sanctum for token auth, MySQL, deployed via Docker (Azure) or cPanel — pick ONE on Day 1 and never touch it again.
- **Mobile:** React Native. Local storage via **SQLite sync queue** (expo-sqlite or react-native-quick-sqlite, or WatermelonDB if you're comfortable — decide Day 1 in <30 min).
- **Sync strategy:** Offline-first for cash flow only. Every local write goes into a `sync_queue` table with a client-generated UUID. When online, flush the queue via a batch `POST /sync` endpoint. Server is source of truth for vault + groups.
- **Conflict rule (keep it dumb):** Last-write-wins by timestamp. Cash flow entries are personal, so conflicts are rare. Don't build a merge engine.
- **IDs:** Client-generated UUIDs everywhere on mobile so offline records don't collide on sync.
- **Back office:** React + a component library (MUI, Ant Design, or shadcn) — do NOT hand-roll admin UI this week.

---

## 3. Day-by-Day Breakdown

> Rhythm: backend first (Days 1–2), mobile core (Days 3–5), back office (Day 6), harden + deploy + buffer (Day 7). Each day lists P0 (must), P1 (should), P2 (cut first).

### 🗓 Day 1 (Fri) — Foundations + Data Model
**Goal by end of day: deployed skeleton API with auth working from Postman.**
- **P0** — Final data model on paper (1 hr max): `users`, `transactions` (cash flow), `vaults`, `vault_movements`, `groups`, `group_members`, `contributions`, `sync_queue` (mobile-side only).
- **P0** — Laravel project scaffold, MySQL connected, migrations for all tables.
- **P0** — Sanctum auth: register, login, logout, `GET /me`.
- **P0** — Deploy the empty API TODAY (Docker on Azure or cPanel). Deploying on Day 1 kills the classic "deployment eats Day 7" trap.
- **P1** — Seeders/factories for fake users, transactions, groups.
- **P2** — CI or automated deploy script.

### 🗓 Day 2 (Sat) — Full API Surface
**Goal: every endpoint the mobile app and back office will call exists and returns correct JSON.**
- **P0** — Cash flow: `GET/POST /transactions`, plus **`POST /sync`** (accepts a batch of UUID-keyed transactions, upserts, returns server state / accepted IDs).
- **P0** — Vault: `GET /vault`, `POST /vault/deposit` (mock), `POST /vault/withdraw` (mock). Movements ledger, computed balance.
- **P0** — Groups: create group, `GET /groups`, group detail, **join via invite code** (generate short code on create — the QR code is just this code rendered as QR), record contribution (mock payment), list members + contribution status.
- **P0** — Validation + consistent JSON error format (do this now, saves hours of mobile debugging).
- **P1** — Admin-only endpoints for back office: users list, transactions list, groups list, simple stats (`/admin/stats`).
- **P2** — Rate limiting, pagination polish.

Test everything with Postman/Insomnia before writing a single line of mobile code.

### 🗓 Day 3 (Sun) — Mobile: Shell + Cash Flow Offline
**Goal: a user can register, log in, and track income/expenses fully offline.**
- **P0** — RN project setup, navigation (auth stack + tab bar: Home/Cashflow, Vault, Groups, Profile).
- **P0** — Auth screens wired to API, token stored securely (Keychain/SecureStore).
- **P0** — SQLite setup: `transactions` table + `sync_queue`. All cash flow reads/writes hit SQLite first, never the network directly.
- **P0** — Cash flow UI: add income/expense (amount, category, note, date), transaction list, simple balance summary.
- **P1** — Category picker with sensible defaults; basic period filter (this week / this month).
- **P2** — Charts. Skip them.

### 🗓 Day 4 (Mon) — Mobile: Sync Engine + Vault
**Goal: offline entries sync automatically when connectivity returns; vault works online with cached offline read.**
- **P0** — Sync engine: NetInfo listener → on reconnect (and on app foreground), flush `sync_queue` in batches to `POST /sync`, mark records synced, pull server changes. Add a small "pending sync" indicator in the UI.
- **P0** — Vault screen: balance, movement history, deposit/withdraw flows ending in the **mock payment screen** ("Payment integration coming soon" + confirm button that records a mock movement).
- **P0** — Vault offline caching: last fetched balance + movements stored locally, shown read-only with a "last updated X ago / offline" banner. Writes disabled offline.
- **P1** — Retry with backoff on failed sync; dedupe by UUID (the server upsert already protects you).
- **P2** — Manual "sync now" button (nice, cheap — add if 30 min free).

### 🗓 Day 5 (Tue) — Mobile: Group Circles
**Goal: create a group, invite via link/QR, join, contribute (mocked), see who's paid.**
- **P0** — Create group flow: name, contribution amount, frequency (weekly/monthly).
- **P0** — Invite: show invite code + QR (react-native-qrcode-svg) + native share sheet for the link.
- **P0** — Join flow: enter code (or scan QR if the lib drops in easily — otherwise code entry only, P1 the scanner).
- **P0** — Group detail: members list, contribution status per cycle, "Contribute" → mock payment screen.
- **P0** — Groups require online: clean "You're offline — groups need a connection" state, not a crash or spinner.
- **P1** — QR scanning, leave group.
- **P2** — Group chat, reminders, kicking members.

### 🗓 Day 6 (Wed) — Back Office
**Goal: an admin can log in and see everything happening in the system.**
- **P0** — React app scaffold + component library, admin login, protected routes.
- **P0** — Dashboard: total users, total transactions volume, total vault balance, active groups (from `/admin/stats`).
- **P0** — Users table (search + detail view: their transactions, vault, groups).
- **P0** — Transactions table with basic filters (date, type, user).
- **P0** — Groups table + group detail (members, contribution status).
- **P1** — Vault movements view; deploy back office (Vercel/Netlify or same server).
- **P2** — Charts, CSV export, admin role management.

A component library makes this genuinely a one-day job. Resist custom design.

### 🗓 Day 7 (Thu) — Harden, Deploy, Buffer
**Goal: everything deployed, tested end-to-end on a real device, known bugs triaged.**
- **P0** — Full end-to-end test on a physical phone: register → track cash offline (airplane mode) → reconnect → verify sync → vault deposit (mock) → create group → join from a second account → contribute → verify it all appears in the back office.
- **P0** — Fix P0 bugs only. Keep a "known issues" list for everything else.
- **P0** — Production env check: HTTPS, env vars, DB backups enabled, error logging (even just Laravel log + Sentry free tier).
- **P0** — Build distributable app (APK / EAS build) and share it.
- **P1** — Loading states, empty states, error toasts polish.
- **P2** — Anything cosmetic.

**Friday July 17 = delivery.** Day 7 is deliberately light — it's your buffer. If Days 3–5 slip, this is where you catch up.

---

## 4. Cut List (in order, if you fall behind)

1. **QR scanning** → invite code entry only (QR display can stay, it's trivial).
2. **Vault offline caching** → vault becomes online-only for v1.
3. **Back office transactions/groups detail views** → dashboard + users table only.
4. **Contribution status per cycle** → just show members + total contributed.
5. **Sync automation** → manual "Sync" button instead of auto-detect (last resort — keep offline writing itself, that's the product).

**Never cut:** offline cash flow tracking, auth, group create/join, the deployed API. That's the MVP's spine.

---

## 5. Feature Checklist per Platform (Definition of Shipped)

### 📱 Mobile app
- [ ] Register / login / logout, token persisted
- [ ] Add income & expense **fully offline** (airplane-mode tested)
- [ ] Transaction list + running balance
- [ ] Auto-sync on reconnect, pending-sync indicator
- [ ] Vault: balance, history, mock deposit/withdraw
- [ ] Vault readable offline (cached) *(cuttable)*
- [ ] Create group with amount + frequency
- [ ] Invite code + QR display + share link
- [ ] Join group via code
- [ ] Contribute (mock payment), see member status
- [ ] Graceful offline states on online-only screens
- [ ] Installable build distributed

### 🖥 Back office
- [ ] Admin login, protected routes
- [ ] Dashboard stats (users, volume, vault total, groups)
- [ ] Users table + user detail
- [ ] Transactions table with filters *(cuttable to basic list)*
- [ ] Groups table + detail *(cuttable)*
- [ ] Deployed on a public URL

### ⚙️ Laravel API
- [ ] Sanctum auth endpoints
- [ ] Transactions CRUD + batch `POST /sync` with UUID upsert
- [ ] Vault endpoints with movements ledger
- [ ] Groups: create / join-by-code / detail / contribute
- [ ] Admin endpoints for back office
- [ ] Consistent validation + error JSON
- [ ] Deployed with HTTPS, env config, DB backups, error logging

---

## 6. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Sync engine eats more than a day | Blocks the core feature | Keep it dumb: UUID + queue + last-write-wins. No merge logic. Fallback: manual sync button. |
| Deployment surprises on final day | Nothing ships | Deploy skeleton API on **Day 1**; deploy back office Day 6, not Day 7. |
| RN environment/build issues | Lost hours | Use Expo (managed or dev client) unless you have a specific reason not to — EAS build for distribution. |
| Scope creep ("just one small feature") | Days 5–7 collapse | Anything new goes to a `WEEK2.md` list, no exceptions. |
| Solo burnout | Quality collapse late-week | Hard stop each night; Day 7 buffer exists so you don't need heroics. |

---

## 7. Week 2 Preview (parking lot)

- MTN MoMo / Orange Money integration via third-party aggregator (read docs, sandbox first, replace mock screens)
- Website / landing page
- QR scanning if cut
- Push notifications for group contribution reminders
- Offline hardening + conflict edge cases

---

## 8. Daily Operating Rules

1. **Start each day by re-reading that day's P0 list.** P1s only after every P0 is done.
2. **Timebox debugging:** stuck >45 min → stub it, note it, move on.
3. **Commit + push at least every 2 hours.** Solo doesn't mean no version control discipline.
4. **End each day with a 5-minute check:** on track? If not, apply the cut list *immediately*, not on Day 6.
5. **The mock payment screen is a feature, not an apology.** Make it clean — it's what users and stakeholders will see.

---

## 9. Mobile App Design Brief (Prompt)

Use this section verbatim as a design/implementation prompt (for yourself, a designer, or an AI agent) when building or restyling the screens in `mobile/src/app/`. It targets the existing Expo Router + TypeScript codebase — `ThemedText`/`ThemedView` in `mobile/src/components/`, tokens in `mobile/src/constants/theme.ts`, and `react-native-reanimated` (already installed) for motion.

> **Design this fintech mobile app to feel like money is being handled by someone competent and calm — not like a generic AI SaaS demo.**
>
> **Product context:** Elikia Fund ("elikia" = *hope*, Lingala) is a savings and group-contribution ("tontine") app for a Francophone African market: an offline-capable cash flow tracker, a PIN-locked savings vault, and group savings circles. Users trust it with real money. Every screen must read as *serious, warm, and precise* — the opposite of a flashy crypto-wallet or a chatbot skin.
>
> ### Design philosophy
> - **Confidence over decoration.** Hierarchy comes from typography scale, spacing, and one accent color — not from gradients, glows, or drop shadows stacked on every card.
> - **Calm, not sterile.** This is a warm, human product (group savings, community, hope) — not a cold enterprise dashboard. Warmth comes from color choice and copy tone (French, direct, respectful), not from illustration clutter.
> - **Numbers are the hero.** Balances, amounts, and PIN digits get the most typographic weight and contrast on every screen. Never let a decorative element outweigh a number.
>
> ### Color — explicitly avoid "AI app" colors
> - **Do not use:** purple-to-pink/violet-to-magenta gradients, neon glow/glassmorphism, electric blue-on-black "tech" themes, or any palette that reads as a generic AI-SaaS landing page. These read as untrustworthy for a money app and are visually generic at this point.
> - **Instead:** pick ONE confident, finance-appropriate accent (deep emerald/forest green for growth and trust, or a warm amber/gold nodding to "Elikia"/hope and West/Central African textile color traditions — pick one, not both) against a restrained neutral base: warm off-white / soft paper tone in light mode, true near-black ink (not pure `#000`) in dark mode. Neutrals should be slightly warm-toned, not clinical gray.
> - Income vs. expense, deposit vs. withdraw use small, desaturated semantic colors (muted green / muted red‑clay) — never saturated "alert red" or "success neon green."
> - Respect `mobile/src/constants/theme.ts`'s light/dark `Colors` split; extend it, don't bypass it with inline hex colors in screens.
>
> ### Elevation & depth — no "over-shadowed" cards
> - **No heavy drop shadows.** Avoid the generic "floating sticker card" look (large blurred shadow under every card/button). Prefer flat surfaces separated by a 1px hairline border (`StyleSheet.hairlineWidth`, already used in the scaffolded screens) or a subtle background-color step (`backgroundElement` / `backgroundSelected` tokens already in `theme.ts`).
> - If a shadow is used at all (e.g. a modal sheet, the PIN entry card), keep it small, tight, and low-opacity — implying a few millimeters of lift, not a hovering panel.
> - Depth hierarchy comes primarily from spacing (`Spacing` tokens) and background-color layering, not from shadow elevation.
>
> ### Typography
> - One typeface family (`Fonts` from `theme.ts`, system font by default) with a clear, restrained scale: large confident balance/title numbers, a small number of weights (regular/medium/semibold — avoid a 6-weight type system).
> - Currency amounts: tabular/monospaced-figure numerals where possible so digits align in lists; the currency unit (FCFA/XAF or app-configured) is visually secondary to the number.
> - Body copy in French throughout; keep sentences short and direct — this is a finance app, not a marketing page.
>
> ### Motion & animation — purposeful, physical, not gratuitous
> - Use `react-native-reanimated` for spring-based, physical motion (mass/damping tuned to feel weighty and precise, not bouncy or cartoonish) — no linear ease, no gratuitous bounce.
> - Meaningful moments to animate: balance updates (count-up/roll transition, not a hard cut), PIN digit entry (subtle scale/fill per digit, shake on error), tab transitions, the vault unlock moment (a deliberate "reveal," reinforcing that this is a protected space), pull-to-refresh, and the mock payment confirmation (a calm, confident success state — see plan §8 rule 5: this screen is a feature, not an apology).
> - Respect `prefers-reduced-motion` / a11y motion settings; every animation must have a non-animated fallback state, not just a faster one.
> - No animation should block input for more than ~200–300ms; this app is used to check money quickly, often one-handed.
>
> ### Screen-by-screen direction (matches the scaffolded routes)
> - **`login.tsx`** (OAuth "Continuer avec…"): calm, confident welcome — wordmark, one-line value proposition, three clearly differentiated but equally-weighted auth buttons (no single button visually "winning" over the others via color; differentiate with each provider's own mark, not app-accent color). No stock illustration of coins/rockets/graphs.
> - **`(tabs)/index.tsx`** (Trésorerie/Cashflow): balance is the largest element on screen; transaction list favors clarity (category, amount, date) over icons-for-icons'-sake; income/expense distinguished by the muted semantic colors above, not by big red/green blocks.
> - **`(tabs)/vault.tsx` + `vault-activate.tsx` + `vault-unlock.tsx`** (Coffre + PIN): the PIN entry is the emotional centerpiece of trust in this app — give it room, a steady focal point, tasteful haptic + micro-animation feedback per digit, and an unmistakable but non-alarming error state (shake, not flashing red). The unlocked vault reveal should feel deliberate, not instant.
> - **`(tabs)/groups.tsx`** (Tontines): community without clutter — member avatars/initials, contribution-cycle status legible at a glance (paid/pending/late), invite/QR flow feels generous and shareable, not transactional.
> - **`(tabs)/profile.tsx`**: quiet, utilitarian — this screen is not a place for brand expression, it's where trust turns into control (session, security, logout).
>
> ### Non-negotiables
> - No gratuitous illustrations, mascots, or stock "fintech" iconography (flying coins, abstract 3D blobs).
> - No dark-pattern urgency (no red pulsing badges, no fake scarcity).
> - Every interactive element has a visible pressed/focus state; touch targets ≥ 44×44pt.
> - Design must hold up with real, unglamorous data: a €0.00 balance, a long category name, a 12-member tontine — not just curated demo content.
