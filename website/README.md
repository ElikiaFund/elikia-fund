# Elikia Fund — Website

Marketing site for Elikia Fund — a Next.js (App Router) app, French-language, 4 pages: Accueil,
À propos, Confidentialité, Conditions. Reuses the brand system already shipped in `mobile/` and
`back-office/` (purple accent, warm-paper neutrals) rather than inventing a new one — see
`src/app/globals.css` for the exact ported design tokens.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npx tsc --noEmit   # type-check
npm run lint       # eslint-config-next
npm run build      # production build
```

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
to load Geist — the same font family `back-office` self-hosts via `@fontsource-variable/geist`.

## Notes

- No real app screenshots exist yet anywhere in the monorepo — the mobile-showcase phone mockups
  (`src/components/phone-mockup/`) are illustrated from the real UI patterns already documented
  elsewhere in the codebase, not screenshots or stock imagery.
- The app isn't published to the App Store or Google Play yet — `src/components/store-badges.tsx`
  are bespoke visual approximations linking to an on-page waitlist section, not the real trademarked
  badge assets or a live store listing. Swap in the official files once the app is actually published.
- `src/app/confidentialite/page.tsx` and `src/app/conditions/page.tsx` are the first draft of these
  documents anywhere in the project — good-faith, not legal advice; see the visible disclaimer on
  both pages.
- Scaffolded with `create-next-app` (TypeScript, Tailwind v4, App Router, ESLint). This is the first
  Next.js app in the monorepo — no root workspace config ties it to `api/`/`mobile/`/`back-office/`,
  matching how those three are each already fully independent.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).
