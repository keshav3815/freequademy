# Freequademy

A free learning platform for Classes 6–12: courses, practice tests, an AI doubt
solver with mentor escalation, mentorship sessions, and a student community.

## Stack

Vite + React + TypeScript + shadcn/ui + Tailwind CSS on the frontend; Supabase
(Postgres, Auth, Row Level Security, Edge Functions) on the backend. No separate
application server — authorization and business rules live in Postgres (RLS
policies, column-level grants, and `SECURITY DEFINER` RPCs), called directly from the
client via `@supabase/supabase-js` and PostgREST.

## Getting started

```bash
npm install
cp .env.example .env.development.local   # point this at a LOCAL or STAGING project — never production
npm run dev
```

See [docs/environments.md](docs/environments.md) for why, and for `supabase start`
setup.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Unit tests (Vitest) |
| `npm run test:db` | Database/RLS tests (pgTAP, disposable Postgres container) |
| `npm run test:e2e` | End-to-end tests (Playwright, against `supabase start`) |

## Documentation

- [docs/environments.md](docs/environments.md) — local/staging/production setup,
  why the Supabase client never hardcodes a project.
- [docs/testing.md](docs/testing.md) — what each of the four test layers covers and
  why.
- [docs/observability.md](docs/observability.md) — error reporting, audit trail,
  known gaps.
- [docs/remediation/](docs/remediation/) — the phased security and product
  remediation this codebase went through (Phase 0 through 8), each with an
  executive summary, exact files changed, and a before/after test matrix. Start
  with [phase-0-security.md](docs/remediation/phase-0-security.md) if you're new
  here — it explains the authorization model (RLS + column grants + `SECURITY
  DEFINER` RPCs) that every later phase builds on — or go straight to
  [phase-8-final-audit.md](docs/remediation/phase-8-final-audit.md) for the
  reconciled findings register, scorecard, and what's left to do.

## Database changes

Write a new file in `supabase/migrations/`, then `npm run test:db` before opening a
PR — CI runs the same script. Migrations apply to a **staging** Supabase project
first (`supabase link --project-ref <staging>` then `supabase db push`); production
is promoted only after staging verification. See
[docs/environments.md](docs/environments.md#database-changes).
