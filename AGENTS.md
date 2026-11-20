# AGENTS.md

Instructions for every contributor working in this repository — human developers and AI coding agents (Claude Code, Codex, Cursor, Copilot, …). Read this file before your first change. Per-app files (`mobile/AGENTS.md`, `website/AGENTS.md`) add framework-specific rules on top of this one.

## The repository

Elikia Fund is a financial-identity platform for informal-economy businesses in Francophone Africa. **One Git repository, five independent apps** — no root workspace, each app has its own dependencies, lockfile, README and tooling:

| Folder | Stack | Scope label |
|---|---|---|
| `api/` | Laravel 13 + Sanctum + MySQL — all business logic | `app:api` |
| `mobile/` | Expo (React Native + TypeScript) — merchant app | `app:mobile` |
| `back-office/` | Vite + React + shadcn/ui — staff dashboard | `app:back-office` |
| `website/` | Next.js (App Router) — marketing site | `app:website` |
| `cloudflare-relay/` | Cloudflare Worker — network relay to the payment provider | `app:relay` |

Repo-wide files (this file, `.gitignore`, root docs) use the `repo` scope. `api/README.md` is the authoritative backend reference — read it before any non-trivial API change.

## Non-negotiable rules

1. **Never push to `main`.** All work lands through a pull request.
2. **Never merge, close, or approve a pull request** — including your own. Only the repository owner (@Arden28) merges or closes PRs. Open the PR and stop there.
3. **Never force-push a branch someone else has pushed to**, and never rewrite history on `main`.
4. **Never commit secrets** — `.env` files, API keys, webhook secrets, keystores, service-account JSON. Only `.env.example` is tracked.
5. **Never commit `CLAUDE.md`.** It is a local, gitignored file for internal notes. Shared instructions belong here, in `AGENTS.md`.
6. **Never edit a migration that is already on `main`.** Add a new migration instead.
7. **All user-facing copy is in French** — mobile, back-office, website, API error messages, notifications.

## Branches

One branch per change, always cut from an up-to-date `main`:

```bash
git fetch origin
git switch -c feat/api-tontine-reminders origin/main
git push -u origin feat/api-tontine-reminders   # sets the upstream to your branch, not main
```

**Naming:** `<type>/<scope>-<short-slug>` — lowercase, hyphenated, ≤ 50 characters.

- `type`: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`
- `scope`: `api`, `mobile`, `back-office`, `website`, `relay`, `repo`
- Examples: `fix/mobile-vault-pin-lockout`, `refactor/api-ddd-tontine-context`, `chore/repo-ci-workflow`

**One app per branch.** A feature that spans apps is split into one PR per app, linked to each other, merged in dependency order. Ship the API first and keep it backward compatible, so the clients still running the previous version keep working.

**Stacked work:** when a branch depends on an unmerged one, base it on that branch (`git switch -c B origin/A`), open its PR with `--base A`, and write "Depends on #N" in the description. After the parent is merged, rebase onto `main` and retarget the PR.

**Keep your branch current** with `git fetch && git rebase origin/main` (safe on a branch only you push to); otherwise merge `origin/main` into it.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), scoped to the app:

```
feat(api): route new signups through Yabeto Connect
fix(mobile): keep the PIN keypad visible on small screens
refactor(api): move tontine payout into the Tontine context
```

- Imperative subject, ≤ 72 characters, no trailing period.
- The body explains **why**; the diff already shows what.
- Keep a commit to one app. Separate mechanical changes (file moves, renames, formatting) from behaviour changes so each is reviewable on its own.
- AI agents add a `Co-Authored-By:` trailer naming the model.

## Pull requests

- **Title:** same format as a commit subject — `feat(api): …`.
- **Labels:** the app label (`app:api`, …) plus one of `enhancement`, `bug`, `documentation`, `architecture`.
- **Body:** `## Summary` (what and why, in 1–5 bullets), anything the reviewer must know before merging (migrations, seeders, env vars, feature flags, deploy order), and `## Test plan` as a checklist of what you ran and what still needs a manual check.
- **Size:** aim for under ~600 changed lines of hand-written code. Larger work goes in a sequence of PRs, not one big one.
- **Unfinished work:** open it as a draft (`gh pr create --draft`).
- **Don't merge `main` into a PR just to refresh it** unless there is a conflict or the owner asks.

```bash
gh pr create --base main --label app:api --label enhancement \
  --title "feat(api): …" --body-file pr.md
```

## Checks before opening a PR

Run the checks for every app you touched. A PR with failing checks is not ready for review.

| App | Commands |
|---|---|
| `api/` | `./vendor/bin/pint` · `php artisan test` (in-memory SQLite, no MySQL needed; export a throwaway `APP_KEY` if `.env` has none) |
| `mobile/` | `npm run lint` · `npx tsc --noEmit` |
| `back-office/` | `npm run lint` · `npm run build` |
| `website/` | `npm run lint` · `npx tsc --noEmit` · `npm run build` |

New behaviour comes with tests. Bug fixes come with a test that fails without the fix.

## Conventions that span the apps

- **Everything is scoped to a company, never directly to a person.** Cash flow, vault, tontines and credit score belong to `companies`; one person with two businesses has two separate financial identities. The vault PIN is the deliberate exception (it belongs to the person).
- **Only cash flow is offline-first.** The mobile app writes it to local SQLite and syncs a queue to `POST /sync`. Vault and tontines are online-only.
- **Money and inventory mutations live in the API's service/application layer,** inside one `DB::transaction()` that also writes an audit row. Controllers stay thin. Never change a balance inline in a controller.
- **Fixed catalogue, dynamic configuration.** Permissions and credit-scoring factors are defined in code; admins can tune them but not add or remove them.
- **Payments:** every money flow supports both the real provider and a simulated fallback, and new companies route through per-merchant Yabeto Connect accounts, while legacy companies keep the plain flow. Never remove either branch without an explicit decision from the owner.
- **Enums are duplicated across apps** (PHP constant, DB enum, `mobile/src/constants/*`, `back-office/src/lib/*`). Change all copies in the same set of linked PRs.
- **One HTTP client per frontend:** each app's `apiService.ts` owns the base URL, auth header and French error messages. Do not create a second axios instance.
- **Back-office deletes are two-step and need a password re-check:** reuse `confirm-delete-dialog.tsx`.
- **Admin endpoints return full collections;** tables paginate on the client. Don't add server pagination to one side only.

## Framework versions

`mobile/` (Expo SDK 57) and `website/` (current Next.js) use versions newer than most models' training data. Read the docs their `AGENTS.md` files point to before writing code there.
