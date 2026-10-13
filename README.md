# PR Tracker — Personal Best Fitness Log

A focused app for recording fitness personal bests. Log a PR once, then keep
appending entries — the app always knows your current best, shows how it has
changed over time, and tracks body metrics alongside it.

Built with [Next.js 16](https://nextjs.org), [Prisma](https://prisma.io),
[Radix UI](https://radix-ui.com), and [Tailwind CSS v4](https://tailwindcss.com).

---

## Features

### 🏋️ Personal bests
- Log an exercise PR (push-ups, pull-ups, 5km run, deadlift, …) or name your own
- Re-logging the same record appends to its history instead of creating duplicates
- Each record keeps the current best value, the date it was set, and every entry behind it
- **Scoring is stored per record, not guessed from the unit.** A plank hold and a 5km
  run are both measured in seconds/minutes, but only the run is "lower is better" —
  presets set the right scoring automatically and you can flip it at any time
- Optional notes and a "verified" flag for judged, filmed or witnessed lifts
- Units are locked per record, so kg and lb entries can never be mixed up

### 📏 Body metrics
- Track bodyweight, body fat %, waist, chest and arm measurements
- Body metrics follow the latest measurement rather than a "best", so trends read naturally
- Latest metric gets a dedicated chart on the metrics page

### 🏆 PR history that never forgets
- Every time you break a record it's written to an append-only achievement log
- "PRs broken" feed on the dashboard, with the size of each jump
- Per-record "Record history" timeline: every time that record fell, and by how much
- A momentum card: days since your last PR, PRs in the last 30 days, how many
  records you've improved, and which improved most

### 🎯 Targets
- Give any record a target value (and optional target date)
- Target drawn on the progress chart, with a bar and "X kg to go"
- Reaching it flips the record to "Reached 🎉"

### 💪 Estimated one-rep max
- Log reps alongside a weighted set and the app derives an Epley 1RM estimate
- Toggle any chart between the logged value and the estimate
- Estimates are only produced at 20 reps or fewer, where Epley is meaningful

### 📈 Progress
- Per-record progress chart with every entry plotted in order
- Current best marked on the chart and in the history list
- Improvement since your first entry, shown in the record's own unit

### 🔍 Browsing
- Searchable, filterable list of every record (All / Exercise PR / Body metric)
- Sparkline and "logged N days ago" on every row, so stagnation is obvious
- Dashboard with totals, records improved this month, latest best, the PR feed
  and a recent-entry feed

### 📤 CSV export / import
- Export every logged entry as CSV (one row per entry)
- Import from a spreadsheet — records are rebuilt in date order and the PRs they
  produced are recreated
- Re-importing a file you already imported is a no-op: matching entries are skipped

### 📱 Responsive design
- Desktop nav bar with backdrop blur, mobile bottom tab bar
- Page transitions powered by the View Transitions API
- Shimmer loading skeletons on every page

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router, Turbopack) |
| **Language** | TypeScript |
| **Database** | PostgreSQL + [Prisma ORM](https://prisma.io) |
| **Auth** | [NextAuth v5](https://next-auth.js.org) (Credentials provider, JWT sessions) |
| **UI Library** | [Radix UI](https://radix-ui.com) + [shadcn/ui](https://ui.shadcn.com) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) |
| **Charts** | [Recharts](https://recharts.org) |
| **Validation** | [Zod](https://zod.dev) |
| **Testing** | [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) |
| **Icons** | [Lucide React](https://lucide.dev) |

---

## Getting Started

### Prerequisites

- Node.js 20.9+ (required for Next.js 16)
- PostgreSQL database

### Installation

```bash
cd fittrack
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and auth secret

# Apply migrations
npx prisma migrate deploy

# Seed demo data
npm run prisma:seed

# Start the development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) and sign in with the seeded
demo account:

- **Email:** `demo@example.com`
- **Password:** `password123`

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/fittrack"

# Auth
AUTH_SECRET="generate-with: npx auth secret"
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + build Next.js |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Vitest tests |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run prisma:seed` | Seed demo data |
| `npm run prisma:migrate` | Create/apply a dev migration |

---

## Project Structure

```
app/
├── (dashboard)/              # Authenticated app shell
│   ├── layout.tsx            # Nav bar, mobile tabs, page transitions
│   ├── page.tsx              # Dashboard (totals, latest best, recent entries)
│   ├── loading.tsx           # Skeleton loading state
│   ├── personal-bests/
│   │   ├── page.tsx          # Searchable list of all records
│   │   ├── new/page.tsx      # Log a PR or body metric
│   │   └── [id]/page.tsx     # Record detail: chart, history, edit, delete
│   ├── body-metrics/page.tsx # Body metric overview
│   └── progress/page.tsx     # Progress chart for any record
├── api/
│   ├── auth/                 # Signup + NextAuth handler
│   ├── personal-bests/       # List / log entries, update / delete a record
│   ├── personal-bests/[id]/attempts/  # Append an entry to a record
│   ├── attempts/[id]/        # Delete an entry (recomputes the best)
│   ├── achievements/         # PR feed
│   ├── export/               # CSV download
│   └── import/               # CSV upload (rebuilds records + PRs)
├── login/ · signup/
├── layout.tsx                # Root layout
└── globals.css               # Theme, view transitions, shimmer

components/
├── ui/                       # shadcn/ui primitives
│   ├── button.tsx, card.tsx, badge.tsx, skeleton.tsx
│   └── input.tsx, textarea.tsx, select.tsx, label.tsx, switch.tsx
├── personal-bests/           # PR-specific components
│   ├── personal-best-form.tsx    # Log form (preset, unit, scoring, reps, target)
│   ├── personal-best-list.tsx    # Rows with sparkline, last-logged, target bar
│   ├── personal-best-filters.tsx # Search + category filter
│   ├── personal-best-actions.tsx # Edit / delete a record and its target
│   ├── log-attempt-form.tsx      # Inline entry form with a 1RM preview
│   ├── attempt-history.tsx       # Entry history with delete
│   ├── progress-chart.tsx        # Value-over-time + target line + 1RM toggle
│   ├── progress-picker.tsx       # Record selector for /progress
│   ├── sparkline.tsx             # Dependency-free SVG sparkline
│   └── import-export.tsx         # CSV upload / download
└── dashboard/                # Dashboard widgets
    ├── stat-cards.tsx, recent-activity.tsx
    ├── consistency-card.tsx      # Momentum: last PR, 30-day totals
    ├── pr-feed.tsx               # Records broken recently
    └── nav-links.tsx

lib/
├── auth.ts                   # NextAuth config + getCurrentUser
├── prisma.ts                 # Singleton Prisma client
├── personal-best.ts          # Units, presets, scoring, targets, 1RM, Zod schemas
├── personal-best-service.ts  # Shared logEntry + best recomputation
├── csv.ts                    # CSV parse / serialize
└── utils.ts                  # cn(), daysUntil()

prisma/
├── schema.prisma             # User · PersonalBest · Attempt · Achievement
├── seed.ts                   # Demo records with realistic history
└── migrations/               # Migration history

test/                         # Test suite
├── setup.ts
├── lib/                      # Domain + service unit tests
├── api/                      # API route tests
└── components/               # Component tests
```

---

## Domain Model

A `PersonalBest` is one named record. Its `bestValue` always mirrors the
attempt history, so the record and its entries can never drift apart.

Every record stores its own `direction` (`HIGHER`, `LOWER` or `LATEST`). A unit
alone cannot decide this — `SECONDS` means "longer is better" for a plank hold
but "faster is better" for a 40m sprint — so presets carry the right scoring for
their record and custom records fall back to a unit-based guess that you can
change in the edit form.

| Category | Units | Typical scoring |
|----------|-------|-----------------|
| `EXERCISE` | reps, sec, min, m, km, kg, lb, count | `HIGHER` for reps/weights/holds, `LOWER` for sprints and runs |
| `BODY_METRIC` | kg, lb, cm, mm, % | `LATEST` — the newest measurement is the current value |

Entries are appended to `Attempt`; deleting or editing history (including
changing a record's unit or scoring) recalculates `bestValue` from what remains.

A record may also carry a `targetValue` / `targetDate`, and weighted entries can
store `reps`, from which an Epley `estimatedOneRep` is derived.

`Achievement` is a separate, append-only log: one row each time a record was
broken, with the previous best. It is never recomputed, so editing or deleting
entries cannot rewrite the fact that you hit a PR on a given day. Body metrics
(`LATEST`) never produce achievements — every measurement would qualify.

---

## API Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Create account |
| `/api/auth/[...nextauth]` | * | NextAuth handler |
| `/api/personal-bests` | GET | List records (`?type=`, `?q=`) |
| `/api/personal-bests` | POST | Log an entry (creates the record if new, records a PR if it wins) |
| `/api/personal-bests/[id]` | GET | Record with full history and PR timeline |
| `/api/personal-bests/[id]` | PATCH | Edit name, unit, scoring, notes, verified, target |
| `/api/personal-bests/[id]` | DELETE | Delete a record, its history and its achievements |
| `/api/personal-bests/[id]/attempts` | POST | Append an entry to a record (`reps` optional) |
| `/api/attempts/[id]` | DELETE | Delete an entry and rebuild the best |
| `/api/achievements` | GET | Every record broken, newest first (`?limit=`) |
| `/api/export` | GET | Download all entries as CSV |
| `/api/import` | POST | Import CSV (`{ csv }`), rebuilding records and PRs |

Responses from the logging endpoints include `isPersonalBest` and
`previousValue`, so the UI can celebrate a new record and show the jump.

---

## Deployment

This app is optimized for [Vercel](https://vercel.com).

```bash
vercel --prod
```

Set `DATABASE_URL` and `AUTH_SECRET` in your Vercel project, and run
`npx prisma migrate deploy` against the production database.

---

## License

Private — internal use.
