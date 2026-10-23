# CLAUDE.md

Guidance for working on this repo. `README.md` has the product overview; this is the short version plus the rules that must not be broken.

## What this is

A planning platform for a **micro wedding** in Israel (up to about 50 guests; the threshold is `MICRO_MAX_GUESTS` in `src/config/benchmarks.ts`). Seven screens: overview (`/`), date checker (`/date`), budget (`/budget`), guests (`/guests`), vendors (`/vendors`), timeline (`/timeline`), registration route (`/route`). Stack: Next.js 16 (App Router, TypeScript), Vitest, Node 22+. No database, no accounts.

- UI language is **Hebrew, RTL**. New UI text is Hebrew; layouts must work RTL and at phone width. Use CSS logical properties.
- The domain facts come from the `israeli-wedding-planner` skill (SKILL.md and `references/`). Numbers live in `src/config/benchmarks.ts`, rules in `src/lib/*.ts`.

## Workflow

Everything lives on **`main`**. Commit and push to `main` after every change, without asking. No PRs or feature branches unless the user asks.

Before pushing: `npm run typecheck && npm test && npm run build`.

## Where things live

```
src/app/              pages (thin server files with metadata) and globals.css
src/components/       app-state.tsx (local store), ui.tsx, nav.tsx
src/components/views/ one client view per screen
src/config/           benchmarks.ts: every price, fee, VAT rate, deadline
src/lib/              pure logic, all tested: hebrew-calendar, date-rules, budget, guests,
                      vendors, timeline, registration, insights, state
```

## Rules that must not be broken

- **Data stays in the browser.** All state is in `localStorage` (`src/components/app-state.tsx`, shape in `src/lib/state.ts`). Do not add a server, a database, analytics, third-party scripts or any network call that carries names, guests, dates or amounts. Export and import are JSON files the user handles.
- **Prices are indicative.** Every price or range is a market band, never a quote. Keep the disclaimer on screens that show one, and keep VAT explicit: 18% since 1 January 2025, halls quote before or after it.
- **Statutory figures are yearly.** VAT, the Rabbinate fee (844 from 1 January 2026), the ACUM tariff (395.30 incl. VAT, 2026) and their deadlines (45 days for the marriage file, 72 hours for ACUM) are in `src/config/benchmarks.ts` only. Update them there at the start of each year.
- **Halachic and statutory rules stay separate.** `date-rules.ts` marks each finding `halachic` or `statutory`. Only the Rabbinate route treats halachic findings as blocking; Yom HaZikaron and Yom HaShoah block in every route because hall closure is by law. Custom (Ashkenazi or Sephardi) changes the Three Weeks and the Omer.
- **Never overstate.** The app guides; the mesader kiddushin and the marriage-registration bureau decide. Do not invent halachic or legal details that the skill does not state. A passed soft deadline is "now", only statutory cut-offs are "missed".
- **No gendered assumptions.** Partners are "ראשון/ה" and "שני/ה"; the bride is named only in the Rabbinate steps that are about her (mikveh).
- Add or update a Vitest test for any change in `src/lib/`. Tests that depend on today's date pass `today` in; never read the clock inside `src/lib/` except in `todayIso` defaults.
- Server components must not import values from `"use client"` files.

## Not built yet (do not assume it exists)

Accounts, sync between devices (use export and import), sharing the plan with family, reminders or notifications, a real calendar integration, calendar rules beyond those in `date-rules.ts` (anything the skill does not state is not flagged), PDF export, an English UI.
