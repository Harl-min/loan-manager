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

Open http://localhost:3000. Demo logins