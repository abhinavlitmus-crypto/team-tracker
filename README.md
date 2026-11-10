# Team Tracker

A Jira-style tracker for team members, tasks and deadlines.

Built with Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Prisma 6 (PostgreSQL) and `@hello-pangea/dnd`. Each team member signs in with their own email and password (no external auth or cloud services).

## Pages

- `/my-tasks`: everything assigned to you, grouped by status, with a status picker on each task.
- `/`: Kanban board (Backlog → Done) with drag and drop, and filters for search, assignee, priority and overdue.
- `/deadlines`: open tasks grouped into Overdue, Due Today, Due This Week and Upcoming.
- `/team`: each member's workload, with active, overdue and done counts.

Click any task to open it.

## Who can do what

| | Admin | Member |
| --- | --- | --- |
| View board, deadlines, team | ✓ | ✓ |
| Create, edit, assign and delete tasks | ✓ | |
| Change the status of tasks assigned to them (drag on the board, or the status picker) | ✓ (any task) | ✓ (own tasks only) |
| Add members, edit them, set access, reset passwords | ✓ | |
| Change their own password | ✓ | ✓ |

These rules are enforced in the server actions, not only hidden in the UI. Admins can't remove their own admin access or delete themselves, so there is always at least one admin.

Resetting someone's password (or changing your own) signs out their other sessions. Members who forget their password ask an admin to reset it.

## Setup

```bash
npm install                 # also runs `prisma generate`

# Option A: use the bundled Postgres (loopback-only, port 5433).
#   .env ships with a strong POSTGRES_PASSWORD, AUTH_SECRET and AUTH_PASSWORD.
docker compose up -d

# Option B: your own Postgres. Copy .env.example to .env and fill in every value.

npx prisma migrate dev      # create tables
npx prisma db seed          # sample project, 4 members, 8 tasks (WIPES existing data)
npm run dev                 # http://localhost:3000 — you'll land on /login
```

**First run:** while no one has a password yet, `/login` shows a "Create admin account" form. Enter the value of `AUTH_PASSWORD` from `.env` as the setup key. If your email matches an existing member (e.g. a seeded one), that member becomes the admin. Then, on the Team page, use the pencil icon to give everyone else a password (members without one show a "No login" badge), or add new members with a starting password.

### Required environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (on Neon, the pooled one). |
| `DIRECT_URL` | Non-pooled connection for migrations. Same as `DATABASE_URL` locally. |
| `POSTGRES_PASSWORD` | Read by `docker-compose.yml`; must match the password in `DATABASE_URL`. |
| `AUTH_SECRET` | Signs session cookies. 32+ bytes — `openssl rand -hex 32`. |
| `AUTH_PASSWORD` | Setup key for creating the first admin account. Not used after that. |

> **Rotating the bundled DB password.** Postgres only applies `POSTGRES_PASSWORD`
> when its data directory is first created. If you already started the old
> container, recreate its volume to pick up a new password (this **wipes** the
> local DB — it only holds sample data):
>
> ```bash
> docker compose down -v && docker compose up -d
> npx prisma migrate deploy && npm run db:seed
> ```

The seed dates are relative to the day you run it, so it always produces 2 overdue tasks, 2 due today and 4 upcoming.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Reset and seed sample data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:deploy` | `prisma migrate deploy` (apply migrations, no prompts) |
| `npm run db:smoke` | Create a test table, insert a row, read it back |

## Deploying to Vercel + Neon

1. Create a Neon project (Vercel Storage tab, or `neon init`).
2. In Vercel → Settings → Environment Variables, set `DATABASE_URL` (Neon pooled string), `DIRECT_URL` (Neon direct string), a fresh `AUTH_SECRET` and `AUTH_PASSWORD`.
3. Deploy. [vercel.json](vercel.json) runs `prisma migrate deploy` before `next build`, so tables are created automatically.
4. Open `/login` and create the admin account with `AUTH_PASSWORD`, then you can remove `AUTH_PASSWORD`.

Note: the login rate limiter is in-memory, so on Vercel each server instance counts separately.

## Code layout

```
prisma/schema.prisma      Member, Project, Task models plus enums
prisma/seed.ts            Sample data
src/actions/              Server actions (tasks: save/delete/move; members: create/delete)
src/lib/data.ts           Server-side queries (run per request via connection())
src/lib/dates.ts          Due-date logic
src/lib/validation.ts     Zod schemas
src/components/board/     Drag-and-drop board and filter bar
src/components/*-modal    Create/edit task and add-member modals
src/app/                  Layout with sidebar, plus the three pages
```

## Notes

- **Due dates are calendar days.** They are stored as UTC midnight and compared as `yyyy-MM-dd` strings. "Today" is computed on the server and passed to the client, so the server and browser always agree on what is overdue.
- **Drag and drop:** the board updates immediately (`useOptimistic`), then the server places the card next to its visible neighbours. This keeps the order correct even when filters hide some cards. Moving a card into Done sets `completedAt`, and moving it out clears it. The board renders only in the browser, which avoids hydration mismatches.
- Deleting a member keeps their tasks and makes them unassigned. A task without a project gets the default `CORE` project, which is created if missing.
