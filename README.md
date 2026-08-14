<div align="center">
  <img src="website/public/logo.svg" alt="Elikia Fund" width="72" />

  # Elikia Fund

  <em>A financial identity for businesses no bank has ever seen.</em>
</div>

<br />

*Elikia* means hope, in Lingala.

Across Congo-Brazzaville — and much of the informal economy across Africa — small business owners run real businesses on cash, memory, and trust. A shopkeeper tracks her sales in a notebook, if she tracks them at all. She saves by handing cash to a tontine, a rotating savings circle held together by nothing but her neighbors' word. When she needs credit to grow, there's no bank statement to show, no bureau that's ever heard of her — nothing but a reputation that never travels beyond her own street.

Elikia Fund exists to change what that reputation can do. It takes the discipline these merchants already practice — showing up, paying in, keeping the books — and turns it into something they can actually point to.

<p align="center">
  <a href="#what-it-does">What it does</a> ·
  <a href="#the-apps">The apps</a> ·
  <a href="#for-developers">For developers</a> ·
  <a href="#documentation-map">Documentation</a>
</p>

---

## What it does

**A cash flow journal, kept simply.** Daily sales and expenses, a product catalog with real cost and margin math, a cash session to open and close the till — all of it works offline first, because a shop's connectivity shouldn't decide whether its owner gets to keep her books.

**A savings vault, protected by a PIN.** Real money, moved through MTN Mobile Money and Airtel Money — every deposit and withdrawal logged the way a bank statement would be, not scribbled in a notebook and forgotten.

**Tontines, digitized.** The same rotating-savings-circle practice millions already trust, minus the paper: automatic reminders, a transparent contribution history everyone in the group can see, four different ways to decide who receives the pot each round — plus a goal-based mode for a group saving toward one shared thing instead of taking turns.

**A credit score built from real behavior.** Every business earns its own score, computed from how consistently it saves, how it manages its cash flow, how reliably it shows up for its tontine — not from a bureau that was never built to see it in the first place. It feeds a real, exportable *dossier de crédibilité financière* a merchant could put in front of an actual lender.

One person can run more than one business, and each gets its own fully separate ledger, vault, tontines, and score — a shopkeeper's second business is its own financial story, not a footnote on the first.

## The apps

- **The app merchants use every day** — bookkeeping, the vault, tontines, entirely in French, built to keep working whether or not the connection does.
- **The dashboard our own team uses** — everything staff need to support merchants, manage tontines, and review credit scores, with real role-based access so support staff and admins each see exactly what they should and nothing more.
- **The website** — where people first hear the story.

---

## For developers

A monorepo: one Laravel API, three clients that talk to it.

### Stack

| App | Stack | Docs |
|---|---|---|
| [`api/`](api) | Laravel 13 + Sanctum + MySQL | [`api/README.md`](api/README.md) |
| [`mobile/`](mobile) | Expo (React Native + TypeScript) | [`mobile/README.md`](mobile/README.md) |
| [`back-office/`](back-office) | Vite + React + shadcn/ui | [`back-office/README.md`](back-office/README.md) |
| [`website/`](website) | Next.js (App Router) | [`website/README.md`](website/README.md) |

### Quick start

1. **API** — create a local MySQL database named `elikia_fund`, then follow [`api/README.md`](api/README.md). Serves at `http://localhost:8000/api`.
2. **Mobile** — follow [`mobile/README.md`](mobile/README.md). Google/Facebook sign-in need a custom dev client, not plain Expo Go — Apple sign-in works in Expo Go.
3. **Back office** — follow [`back-office/README.md`](back-office/README.md). Log in with a seeded staff account.
4. **Website** — follow [`website/README.md`](website/README.md). Serves at `http://localhost:3000`.

### Architecture highlights

- **Company-isolated everything.** Cash flow, vault, tontines, and credit score are all scoped to a company, not a person — a user with two businesses gets two completely separate financial identities. The one deliberate exception: the vault PIN belongs to the person, a foundation for letting several people share one company's vault later.
- **Offline-first cash flow.** The mobile app reads live when connected and falls back to a local SQLite cache when it isn't, syncing back up once the connection returns — the only feature built this way, since it's the one that can't afford to wait on a signal.
- **Real mobile money, not a simulation.** A full Yabeto Pay integration (MTN Mobile Money, Airtel Money) — see [`yabeto.md`](yabeto.md) for the complete payment-provider reference — with a simulated fallback so the rest of the app stays fully testable without live credentials.
- **A configurable credit-scoring engine.** A weighted scorecard over a fixed set of factors (account age, transaction regularity, savings behavior, income/expense ratio, tontine participation, company profile), tunable from the back office without a redeploy.
- **A real back office, not an afterthought.** Full role-based access control, a reusable data table across every admin list view, and step-up password confirmation before anything gets deleted.

### Documentation map

- [`CLAUDE.md`](CLAUDE.md) — the deep architecture reference: how and why things are built the way they are. Written for AI coding agents, useful for any contributor.
- [`fintech-mvp-one-week-plan.md`](fintech-mvp-one-week-plan.md) — the original sprint scope and day-by-day plan.
- [`yabeto.md`](yabeto.md) — the full mobile-money payment provider reference.
- Each app's own README for setup, structure, and day-to-day commands.

## Language

All mobile, back-office, and website copy is in French.
