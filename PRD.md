# FitTrack — Product Requirements Document (PRD)

---

## 1. Overview

**FitTrack** is a gamified fitness tracking application with a *Solo Leveling*–inspired hunter theme. It turns daily training into quests, tracks eight hunter stats, generates AI weekly plans and daily quests via Groq, and benchmarks progress against real fitness standards.

**One-line pitch:** A Solo Leveling–themed fitness tracker that levels up your hunter stats through daily quests, session logging, and AI-guided weekly planning.

---

## 2. Background & Problem Statement

Fitness consistency is hard to sustain because:

- **No compelling feedback loop.** Logging workouts often feels like paperwork with no visible payoff, so motivation drops.
- **Generic plans don't fit the individual.** Off-the-shelf programs ignore your current strengths/weaknesses, recent soreness, and goals.
- **Benchmarks are disconnected from day-to-day training.** People measure progress inconsistently and don't tie numbers back to a coherent stat system.
- **Daily intent is easy to lose.** Without a concrete, time-bounded target for today, it is easy to skip the session or do something random that doesn't move the right metric.

FitTrack addresses these by modeling the user as a hunter with eight stats, issuing daily quests that target weak areas, rewarding completion and penalizing failure in a controlled 3:1 ratio, and generating weekly training plans with AI.

---

## 3. Goals & Success Metrics

| Goal | How we measure it |
|------|-------------------|
| Make stats meaningful | 8 hunter stats (0–100) displayed on a radar chart; level + rank derived from average stat value; full stat history retained. |
| Drive daily training | AI-generated daily quests target weakest stats; quests can be accepted, completed, or failed; failure sweep runs automatically. |
| Personalize plans | AI weekly planning generates a 7-day plan from recent sessions, goals, and stat weaknesses, and extracts 1–3 daily quests. |
| Track real training | Sessions log date, activity type, duration, RPE (1–10), optional notes, optional linked goal, optional exercises with sets/reps/values, and optional stat boosts. |
| Keep goals visible | Goals have PRIMARY/SECONDARY priority and target dates; active goals show countdowns on the dashboard; completed goals archive; unwanted ones delete. |
| Benchmark against reality | Benchmarks (push-ups, sprint times, run times, etc.) compare against built-in fitness standards (Beginner → Excellent) with reference lines on a chart. |
| Create a cohesive theme and UX | Dark navy theme, desktop nav + mobile 5-tab bottom bar, View Transitions animations, shimmer loading skeletons, reduced-motion support. |

---

## 4. Target Users

- **Primary:** Individual fitness enthusiasts who like RPG/gamification metaphors and want structure, daily targets, and benchmark tracking.
- **Secondary:** Casual athletes looking for AI-generated weekly guidance without building a program from scratch.

---

## 5. Feature Specification

### 5.1 Gamified Stats System

- **8 hunter stats:** Strength (STR), Endurance (END), Agility (AGI), Speed (SPD), Power (PWR), Flexibility (FLX), Vitality (VIT), Discipline (DSC).
- **Range:** Each stat is 0–100.
- **Visualization:** Radar chart on the Stats page.
- **Progression metadata:**
  - **Hunter Level** and **Rank** (E through S) derived from average stat value.
  - **Stat history** records every gain and loss over time.
- **Sources of change:** onboarding calibration, quest completion/failure, session stat boosts, and benchmark-based recalibration.

### 5.2 Daily Quests

- **AI-generated daily quests** target the user's weakest stats.
- **Accept window:** quests must be accepted before midnight or they fail.
- **Outcome model:**
  - Completion applies stat gains.
  - Failure applies penalties.
  - Gain/penalty ratio is 3:1.
- **Custom quest creation** with manual stat reward assignment.
- **Quest lifecycle states:** `OFFERED → PENDING → COMPLETED / FAILED`.
- **Automatic failure sweep:**
  - Runs on dashboard load and via a protected cron endpoint.
  - Fails expired PENDING quests and cleans up stale OFFERED quests.

### 5.3 AI Weekly Planning (Groq)

- Generates a **7-day training plan** from:
  - Recent sessions (last 7 days)
  - Active goals
  - Current stat values (weakest first)
- Extracts **1–3 daily quests** from the plan.
- Powered by Groq's **Llama 3.3 70B** model.
- Quest generation prompt enforces specific, single-session targets, difficulty scaling, and the 3:1 gain/penalty ratio, and returns a parseable JSON array.

### 5.4 Session Tracking

- **Log training sessions** with:
  - Date
  - Activity type
  - Optional linked goal
  - Focus note
  - Duration
  - RPE (1–10)
  - Notes
- **Optional exercise detail:** sets, reps, and/or a numeric value per exercise, with notes.
- **Optional stat boosts** applied when logging a session (small manual stat increases).
- **Training consistency bar chart** on the Stats page.

### 5.5 Goals

- **Create active goals** with:
  - Name
  - Priority: `PRIMARY` or `SECONDARY`
  - Target date (optional)
  - Notes (optional)
- **Dashboard countdown** for active goals with target dates.
- **Archive** completed goals; **delete** unwanted ones.
- Goals can be linked to sessions.

### 5.6 Benchmarks & Fitness Standards

- **Track physical benchmarks:** push-ups, sprint times, run times, etc.
- **Metric units** supported: REPS, SECONDS, MINUTES, METERS, KM, KG, LB, COUNT.
- **Built-in fitness standards** with levels from Beginner → Excellent.
- **Benchmark progress chart** with standard reference lines.
- **Auto-recalibration:** some benchmarks map to stats and blend into the stat value (40% prior / 60% benchmark evidence), with a recorded reason.

### 5.7 Responsive Design

- **Desktop:** nav bar with backdrop blur.
- **Mobile:** 5-tab bottom bar.
- **Page transitions** via the View Transitions API.
- **Loading skeletons** with shimmer animation on all pages.

### 5.8 Dark Navy Theme

- **Full dark mode** with a navy-blue palette.
- **Subtle radial gradient background.**
- **Custom scrollbar and selection styling.**
- **Reduced motion support.**

---

## 6. Tech Stack

| Layer | Technology |
|-------|-------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Auth** | NextAuth v5 (Credentials provider, JWT sessions) |
| **UI library** | Radix UI + shadcn/ui |
| **Styling** | Tailwind CSS v4 |
| **Animations** | View Transitions API |
| **Charts** | Recharts |
| **AI** | Groq SDK (Llama 3.3 70B) |
| **Validation** | Zod |
| **Testing** | Vitest + Testing Library |
| **Icons** | Lucide React |
| **Theming** | next-themes |
| **Other runtime deps** | bcryptjs, class-variance-authority, clsx, tailwind-merge, tw-animate-css, shadcn |
| **Dev tooling** | ESLint, tsx, vitest-mock-extended, jsdom |

**Notable package.json entries:** `next 16.2.9`, `next-auth ^5.0.0-beta.31`, `@prisma/client ^5.20.0`, `prisma ^5.20.0`, `groq-sdk ^1.3.0`, `recharts ^2.15.4`, `zod ^3.25.76`, `vitest ^4.1.9`.

---

## 7. Data Model

### 7.1 Entities

| Model | Description | Key fields |
|-------|-------------|------------|
| **User** | Authenticated user | `id`, `email` (unique), `name?`, `password`, `timezone` (default `Asia/Jakarta`), `createdAt` |
| **ActivityType** | User-defined session activity categories | `userId`, `name`, `color?`, unique `(userId, name)` |
| **Goal** | Training goal | `userId`, `name`, `priority` (enum, default SECONDARY), `status` (enum, default ACTIVE), `targetDate?`, `notes?`, `createdAt`, `archivedAt?` |
| **Session** | Logged training session | `userId`, `date`, `activityTypeId`, `goalId?`, `focus?`, `duration?`, `rpe?`, `notes?`, `createdAt` |
| **Exercise** | User-defined exercise library entry | `userId`, `name`, `category` (enum), `unit` (enum), `statTags[]` (StatType) |
| **SessionExercise** | Exercise instance within a session | `sessionId`, `exerciseId`, `sets?`, `reps?`, `value?`, `notes?` |
| **Benchmark** | Physical benchmark measurement | `userId`, `metric`, `value`, `unit`, `date` (default now) |
| **FitnessStandard** | Built-in reference standard for a metric | `metric`, `unit`, `ageMin?`, `ageMax?`, `gender?`, `level`, `value` |
| **Stat** | Current hunter stat value | `userId`, `type` (StatType enum), `value` (Float), `updatedAt`; unique `(userId, type)` |
| **OnboardingResponse** | Raw onboarding answer + mapping | `userId`, `questionKey`, `rawAnswer`, `mappedStat`, `mappedValue`, `createdAt` |
| **StatHistory** | Audit trail of stat changes | `userId`, `type`, `delta`, `reason`, `questId?`, `createdAt` |
| **Quest** | Daily quest | `userId`, `date` (default now), `title`, `description?`, `targetText`, `status` (enum, default OFFERED), `acceptedAt?`, `sessionId?`, `resolvedAt?`, `completionNote?`, `verified` (default false), `createdAt` |
| **QuestStatReward** | Per-stat reward/penalty for a quest | `questId`, `type`, `completionValue`, `failurePenalty` |

### 7.2 Enums

**StatType** (8 values):
`STR`, `END`, `AGI`, `SPD`, `PWR`, `FLX`, `VIT`, `DSC`

**ExerciseCategory** (5 values):
`STRENGTH`, `CONDITIONING`, `SKILL`, `FLEXIBILITY`, `OTHER`

**MetricUnit** (8 values):
`REPS`, `SECONDS`, `MINUTES`, `METERS`, `KM`, `KG`, `LB`, `COUNT`

**GoalPriority** (2 values):
`PRIMARY`, `SECONDARY`

**GoalStatus** (2 values):
`ACTIVE`, `ARCHIVED`

**QuestStatus** (4 values):
`OFFERED`, `PENDING`, `COMPLETED`, `FAILED`

### 7.3 Relationships

- `User` 1 → N `ActivityType`, `Exercise`, `Session`, `Benchmark`, `Goal`, `Stat`, `StatHistory`, `Quest`, `OnboardingResponse`
- `ActivityType` 1 → N `Session`
- `Goal` 1 → N `Session`
- `Session` 1 → N `SessionExercise`, `Quest`
- `Exercise` 1 → N `SessionExercise`
- `Quest` 1 → N `QuestStatReward`, `StatHistory`
- Cascade deletes: removing a user removes their related records.

### 7.4 Key Indexes

- `(userId, status)` on Goal
- `(userId, date)` on Session
- `(activityTypeId)` on Session
- `(userId, metric, date)` on Benchmark
- `(metric, level)` on FitnessStandard
- `(userId, type, createdAt)` on StatHistory
- `(userId, date)` on Quest

---

## 8. API Surface

All routes require authentication via NextAuth JWT except the cron endpoint, which is protected by `CRON_SECRET`.

### Authentication

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create account and return user. |
| `*` | `/api/auth/[...nextauth]` | NextAuth handler (sign-in/sign-out). |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/sessions` | List sessions (optional `goalId`, `activityTypeId` filters). |
| `POST` | `/api/sessions` | Create session; optionally include exercises, stat boosts. On success, applies stat boosts in a transaction and returns the created session. |
| `PATCH` | `/api/sessions/[id]` | Update session. |
| `DELETE` | `/api/sessions/[id]` | Delete session. |

### Quests

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/quests` | Create a custom quest. |
| `GET` | `/api/quests/today` | Get today's quests; auto-generates via Groq if none exist for today. |
| `POST` | `/api/quests/generate` | Force-regenerate today's quests. |
| `POST` | `/api/quests/[id]/accept` | Accept an OFFERED quest → PENDING. |
| `POST` | `/api/quests/[id]/complete` | Complete a PENDING quest; requires `completionNote` (≥5 chars); applies stat gains and history in a transaction; optionally links `sessionId`. |
| `GET` | `/api/quests/log` | Quest history. |

### Goals

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/goals` | List goals (default active; `status=archived` or `status=all`). |
| `POST` | `/api/goals` | Create goal. |
| `DELETE` | `/api/goals/[id]` | Delete goal. |
| `POST` | `/api/goals/[id]/archive` | Archive a goal. |

### Benchmarks & Stats

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/benchmarks` | List benchmarks (optional `metric` filter) + fitness standards for that metric. |
| `POST` | `/api/benchmarks` | Create benchmark; auto-recalibrates mapped stat if applicable. |
| `GET` | `/api/stats/history` | Stat change history (optional `type` filter, validated against StatType). |

### AI & Onboarding

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/ai/suggest` | Generate a weekly plan + quests (AI weekly planning). |
| `POST` | `/api/onboarding` | Submit onboarding responses; maps answers to stats, creates `OnboardingResponse` rows, seeds/updates all 8 stats, returns the resulting stats. |
| `GET` | `/api/onboarding/status` | Onboarding status/check. |

### Exercises, Activity Types & Cron

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/exercises` | List user exercises. |
| `POST` | `/api/exercises` | Create exercise. |
| `GET` | `/api/activity-types` | List user activity types. |
| `GET` | `/api/cron/quest-sweep` | Protected cron endpoint; fails expired PENDING quests and deletes stale OFFERED quests; returns `{ ok: true, resolved }`. |

---

## 9. Core Algorithms

### 9.1 Onboarding Stat Calibration

- 8 onboarding questions map to stats:
  - `max_pushups` / `max_pullups` → STR
  - `five_k_run` → END
  - `sprint_ability` → SPD, PWR
  - `flexibility` → FLX
  - `training_days` → DSC
  - `recovery_speed` → VIT
  - `coordination` → AGI
- Answers are bands A–D with default band values `A: 12`, `B: 22`, `C: 30`, `D: 38`.
- Per-question overrides exist for `max_pushups`, `max_pullups`, and `flexibility`.
- Multiple questions can feed the same stat; the final value is the average of mapped values.
- Any stat not covered by questions is seeded at 15 so all 8 always exist.

### 9.2 Quest Generation (AI)

- Stats are sorted weakest first.
- The prompt includes stat summary, recent training (last 7 days), and active goals.
- The model is instructed to:
  - Prioritize the weakest 2–3 stats
  - Include at least one recovery/light quest if recent RPE is high (7+)
  - Make quests specific and completable in one session
  - Scale difficulty (Easy = small reward, Hard = big reward)
  - Use a 3:1 gain/penalty ratio
- The response must be a JSON array; the code strips markdown fences, extracts the first JSON array match, parses it, and creates quests with rewards in a transaction.
- Before creating new quests for today, any existing OFFERED quests for today are deleted (within the same transaction).

### 9.3 Quest Failure Sweep

- Local midnight is used as the day boundary, matching quest creation time.
- Expired PENDING quests are marked FAILED with `resolvedAt`, their failure penalties are decremented from stats, and `StatHistory` rows are created.
- Stale OFFERED quests (never accepted, past their day) are deleted.
- The operation runs in a transaction.

### 9.4 Benchmark → Stat Recalibration

- A `BENCHMARK_STAT_MAP` maps some metrics to stats (for example, Max Push-ups → STR; 40m Sprint → SPD; 5km Run → END).
- A per-metric scale maps raw values to a 0–100 score; inverted scales (lower is better) are handled explicitly.
- When a mapped benchmark is logged, the target stat is blended as `current * 0.4 + newScore * 0.6`; if the delta is ≥ 1, the stat and a `StatHistory` row are updated with reason text.

---

## 10. Non-Functional Requirements

### 10.1 Security

- Passwords hashed with bcrypt.
- Credentials validated with Zod at login.
- Every user-scoped API route checks ownership via `getCurrentUser()` / `userId` filters.
- Cron endpoint requires `Authorization: Bearer <CRON_SECRET>`.
- Input validated with Zod on creation endpoints.

### 10.2 Reliability

- Prisma singleton client.
- Stat changes that affect multiple records use transactions (quest completion, quest failure sweep, stat boosts, onboarding, benchmark recalibration).
- Quest day boundary logic uses local midnight consistently across generation and sweep.

### 10.3 Observability & Defaults

- Default user timezone is `Asia/Jakarta`.
- Quest generation fails gracefully (returns empty array) if the Groq response is not parseable, rather than throwing to the user-facing route.

---

## 11. Testing Strategy

| Suite | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | `lib/*` logic (for example onboarding mapping, validation schemas, quest/sweep logic where covered) |
| API | Vitest | API route tests under `test/api/` |
| Component | Vitest + Testing Library | Component tests under `test/components/` |
| Setup | `test/setup.ts` | Test environment setup |

**Run commands:**
```bash
npm test          # Vitest run
npm run test:watch
npm run test:ui   # Vitest UI
```

---

## 12. Project Structure

```
fittrack/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx       # Nav bar, mobile tabs, page transitions
│   │   ├── page.tsx         # Dashboard
│   │   ├── loading.tsx      # Skeleton loading state
│   │   ├── goals/
│   │   ├── quests/
│   │   ├── sessions/
│   │   │   └── new/
│   │   └── stats/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── signup/route.ts
│   │   │   └── [...nextauth]/route.ts
│   │   ├── sessions/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   ├── quests/
│   │   │   ├── route.ts
│   │   │   ├── today/route.ts
│   │   │   ├── generate/route.ts
│   │   │   ├── log/route.ts
│   │   │   └── [id]/
│   │   │       ├── accept/route.ts
│   │   │       └── complete/route.ts
│   │   ├── goals/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       └── archive/route.ts
│   │   ├── benchmarks/route.ts
│   │   ├── stats/history/route.ts
│   │   ├── ai/suggest/route.ts
│   │   ├── onboarding/
│   │   │   ├── route.ts
│   │   │   └── status/route.ts
│   │   ├── cron/quest-sweep/route.ts
│   │   ├── exercises/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── activity-types/route.ts
│   ├── login/
│   ├── signup/
│   ├── onboarding/
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── dashboard/           # widgets
│   ├── sessions/
│   ├── quests/
│   └── goals/
├── lib/
│   ├── auth.ts
│   ├── prisma.ts
│   ├── quest.ts
│   ├── quest-sweep.ts
│   ├── onboarding.ts
│   ├── validation.ts
│   └── utils.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── test/
│   ├── setup.ts
│   ├── lib/
│   ├── api/
│   └── components/
├── public/
├── validation/
├── docs/
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── vercel.json
├── proxy.ts
└── package.json
```

---

## 13. Deployment & Operations

- **Optimized for Vercel.** `vercel.json` is pre-configured.
- **Cron:** configure a Vercel Cron Job pointing to `/api/cron/quest-sweep` using `CRON_SECRET` as the Bearer token.
- **Required environment variables:**
  - `DATABASE_URL`
  - `NEXTAUTH_URL`
  - `NEXTAUTH_SECRET`
  - `GROQ_API_KEY`
  - `CRON_SECRET`

---

## 14. Future Improvements

### 14.1 Gamification Depth

- **Rank progress visualization** — show proximity to the next rank with clear thresholds.
- **Quest streaks and rewards** — consecutive completion streaks, bonus rewards, and streak-loss behavior.
- **Hunter title / class progression** — unlock titles or class-like identities as stats or milestones grow.
- **Seasonal or rotating quest themes** — time-limited quest types to keep daily targets fresh.

### 14.2 AI & Planning

- **Iterative plan editing** — let users tweak the AI weekly plan before committing.
- **Multi-objective planning** — balance multiple active goals and avoid overloading a single weak stat.
- **Recovery-aware scheduling** — use recent RPE and soreness signals to lighten the next day's load.
- **Alternative model/providers** — allow switching models or providers for planning and quest generation.
- **Grounded responses** — return the plan with citations to recent sessions/goals rather than only raw text.

### 14.3 Tracking & Analytics

- **Exercise library enhancements** — exercise substitutions, progression templates, and per-exercise progression history.
- **Activity-type analytics** — volume by activity type, consistency trends, and time-of-day patterns.
- **Heart rate / wearables integration** — import workout data from devices or apps.
- **Body metrics** — weight, body measurements, or photos tied to benchmarks and goals.

### 14.4 Benchmarks & Standards

- **Personalized standards** — adapt reference lines based on age/gender/history where appropriate.
- **Custom standards** — let users define their own reference levels.
- **Benchmark verification** — mark some benchmarks as verified to increase their weight in recalibration.

### 14.5 Platform & Reliability

- **Mobile app / PWA** — stronger offline support and home-screen installation.
- **E2E coverage** — broader Playwright/Cypress coverage for auth, quest lifecycle, and session creation.
- **Load and cron resilience** — verify cron behavior, idempotency, and error handling under failure.
- **Data portability** — full export of stats, sessions, quests, goals, and benchmarks.
- **Multi-timezone handling** — stronger support for users outside the default timezone.
- **Accessibility** — broader WCAG pass across charts, skeletons, and custom components.

### 14.6 UX Polish

- **Empty states and onboarding nudges** — clearer paths when there are no sessions, quests, or goals yet.
- **Undo / rollback for stat changes** — limited undo for accidental stat boosts or quest completion notes.
- **Keyboard navigation** — improved keyboard flows for logging sessions and completing quests.

---

## 15. Acceptance Criteria (Current Release)

- [ ] A new user can sign up and log in; sessions persist via JWT.
- [ ] Users complete onboarding; all 8 stats are seeded/calibrated from band answers, with uncovered stats defaulting to 15.
- [ ] The dashboard shows the gamified stats system: radar chart, hunter level, rank, and stat history.
- [ ] Daily quests are AI-generated against weakest stats, with 3:1 gain/penalty rewards; quests can be accepted, completed (with a ≥5-char completion note), or failed.
- [ ] The quest failure sweep runs on dashboard load and via the protected cron endpoint, failing expired PENDING quests and cleaning stale OFFERED quests.
- [ ] Sessions can be logged with activity type, optional goal, duration, RPE, notes, optional exercises, and optional stat boosts; stat boosts apply in a transaction.
- [ ] Goals support PRIMARY/SECONDARY priority, target dates, dashboard countdowns, archiving, and deletion.
- [ ] Benchmarks can be logged with units and auto-recalibrate mapped stats using the 40/60 blend.
- [ ] The AI weekly planning endpoint generates a 7-day plan and extracts quests via Groq.
- [ ] The UI is responsive (desktop nav + mobile 5-tab bar), uses View Transitions, shimmer skeletons, and a dark navy theme with reduced-motion support.
- [ ] All user-scoped routes enforce ownership; inputs are validated with Zod; cron is protected by `CRON_SECRET`.
- [ ] Tests run via Vitest for lib, API, and component suites.

---

*Generated from the FitTrack codebase (Next.js 16, TypeScript, PostgreSQL, Prisma, NextAuth v5, Groq, Recharts, Tailwind CSS v4, Radix UI + shadcn/ui).*
