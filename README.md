# Team Tracker

A Jira-style tracker for team members, tasks and deadlines.

Built with Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Prisma 6 (PostgreSQL) and `@hello-pangea/dnd`. Access is gated by a single shared password (no external auth or cloud services).

## Pages

- `/`: Kanban board (Backlog → Done) with drag and drop, and filters for search, assignee, priority and overdue.
- `/deadlines`: open tasks grouped into Overdue, Due Today, Due This Week and Upcoming.
- `/team`: each member's workload, with active, overdue and done counts.

Click any task to edit or delete it.

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

Sign in with the value of `AUTH_PASSWORD` from `.env`.

### Required environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `POSTGRES_PASSWORD` | Read by `docker-compose.yml`; must match the password in `DATABASE_URL`. |
| `AUTH_SECRET` | Signs session cookies. 32+ bytes — `openssl rand -hex 32`. |
| `AUTH_PASSWORD` | The shared sign-in password. |

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
