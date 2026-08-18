# Neptune — Loan Manager

A Next.js (App Router) loan-servicing portal: dashboard, loan detail (overview,
payments, transactions, amortization schedule, documents), a standalone loan
calculator, profile settings, role-based auth, and a built-in service that
logs every button/link click to the database.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**, themed entirely through CSS variables (see "Re-branding")
- **NextAuth** (Credentials provider, JWT sessions) with `BORROWER` / `ADMIN` roles
- **Prisma** + SQLite by default (swap the datasource for Postgres/MySQL in production)
- Zero extra UI kit — small hand-rolled primitives in `components/ui`

## Getting started

```bash
npm install
cp .env.example .env        # edit values as needed
npm run db:push             # create the SQLite schema
npm run db:seed             # seed a demo borrower + admin + one loan
npm run dev
```

Open http://localhost:3000. Demo logins (from the seed script):

| Role     | Email                     | Password    |
|----------|---------------------------|-------------|
| Borrower | harlmeen51@gmail.com      | password123 |
| Admin    | admin@neptune.dev        | admin123    |

New sign-ups go through email/OTP verification. No email provider is wired
up in this starter — the 6-digit code is printed to the server console
(`[neptune] OTP for ...`). Swap in Resend/SES/Postmark in
`app/api/register/route.ts` and `app/api/register/resend/route.ts` for
production.

## Pointing at an external backend

Every data call goes through `lib/api.ts`, which prefixes requests with
`NEXT_PUBLIC_API_URL` (see `.env.example`). By default this points back at
this project's own `/api` routes (backed by Prisma). To use a separate
backend server instead, just change the env var — for example:

```
NEXT_PUBLIC_API_URL="http://192.168.1.20:4000/api"
```

No call sites need to change.

## Role-based auth

- `middleware.ts` requires a valid session for `/dashboard`, `/loans/*`,
  `/calculator`, `/settings`, and `/admin`.
- `/admin/*` additionally requires `role === "ADMIN"` — borrowers are
  redirected back to `/dashboard`.
- The role lives in the JWT/session (`lib/auth.ts`), so any page or API
  route can check `session.user.role`.

## Re-branding / white-labeling

Colors, name, and tagline are driven entirely by environment variables and
one config file — Tailwind class names never change:

1. Edit the `NEXT_PUBLIC_BRAND_*` variables in `.env` (name, tagline, and
   RGB triples for primary/accent colors), **or**
2. Edit the fallback defaults in `lib/brand.ts`.

`app/layout.tsx` injects those values as CSS custom properties
(`--color-primary`, etc.) once, in `<head>`. `tailwind.config.ts` maps
semantic utility classes (`bg-primary`, `text-accent`, `border-border`, …)
to those variables via `rgb(var(--x) / <alpha-value>)`, so opacity
utilities (`bg-primary/10`) keep working. Swapping a brand is a config/env
change only — no component, no Tailwind class, and no rebuild-time content
change is required beyond restarting the dev/prod server to pick up the
new env values.

Swap the monogram in `components/Sidebar.tsx` for an `<img>` logo when you
have brand assets.

## Button-activity tracking service

Every click on a `<button>`, `<a>`, `[role="button"]`, or any element
tagged `data-track` is captured automatically — no per-button wiring
required:

- `components/ClickTracker.tsx` is mounted once in the root layout and
  attaches a single capture-phase `click` listener on `document`.
- `lib/tracking.ts` queues events in memory and flushes them in batches
  (every 4s, at 10 events, or on page unload via `navigator.sendBeacon`) to
  avoid one network request per click.
- `app/api/events/route.ts` persists each event (`label`, `elementId`,
  `path`, `metadata`, `userId` if signed in, `sessionId`, timestamp) to the
  `ClickEvent` table via Prisma.
- `/admin` includes a simple activity log view (admin-only) reading that
  table back out.

Add `data-track-label="My Button"` to any element for a nicer label in the
log; otherwise the tracker falls back to `aria-label`, then visible text.

## Project structure

```
app/
  (auth)/login, register, verify-email      — public auth pages
  (dashboard)/dashboard, loans/[id]/*,
              calculator, settings          — authenticated app, behind middleware
  (admin)/admin                             — admin-only activity log
  api/
    auth/[...nextauth]                      — NextAuth handler
    register, register/resend, verify       — signup + OTP
    loans, loans/[id], loans/[id]/payments  — loan data
    profile                                 — profile & preferences
    events                                  — click-tracking ingestion
components/                                 — UI primitives + feature components
lib/                                        — prisma client, auth config, api client,
                                               brand/theme config, tracking utility
prisma/                                     — schema + seed script
middleware.ts                               — auth + role-based route guarding
```

## Production notes

- Swap `DATABASE_URL`/`datasource` in `prisma/schema.prisma` for Postgres/MySQL.
- Wire a real email provider for OTP delivery.
- Add a Google OAuth provider to `lib/auth.ts` if you want the "Continue with
  Google" buttons to actually authenticate (they're present in the UI as a
  placeholder matching the design).
- Rotate `NEXTAUTH_SECRET` and set `NEXTAUTH_URL` to your deployed origin.
