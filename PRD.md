# PRD — PR Tracker (Personal Best Fitness Log)

## 1. Purpose

A single personal tool for recording fitness personal bests. The user wants one
place to answer three questions at any moment:

1. **What are my personal bests right now?**
2. **How has each one changed over time?**
3. **What is my body doing while I train for them?**

Earlier versions of this project gamified training (stats, quests, goals,
sessions). This rewrite drops all of that. The product is now a personal best
log: fast to record, hard to get wrong, honest about history.

## 2. Target user

One motivated lifter/runner tracking their own numbers, mostly on a phone at the
gym, occasionally at a desk reviewing progress. No social features, no coach, no
team.

## 3. Goals

- **Recording is fast.** Logging a PR takes under 15 seconds on a phone.
- **The best is never wrong.** The stored best value is always derivable from
  the entry history.
- **Comparisons are meaningful.** Units never get mixed within a record, and
  scoring is stored per record: the app knows a longer plank hold is better while
  a faster 5km run is better, even though both are measured in time.
- **Progress is visible.** Every record has a chart of its own history.

## 3b. Additions after the first release

Shipped in the follow-up pass, driven by "what makes a PR log actually useful":

- **Achievement log.** An append-only record of every time a record was broken,
  with the previous best. Powers the dashboard PR feed and a per-record timeline.
  Not recomputed on edit/delete — it records what happened.
- **Targets.** Optional target value and date per record, drawn on the chart with
  a progress bar and a "X to go" readout.
- **Estimated 1RM.** Optional reps on a weighted entry yield an Epley estimate,
  toggleable on any chart.
- **Sparkline + last-logged** on every list row, so stagnation is visible at a glance.
- **Momentum card.** Days since last PR, PRs in 30 days, records improved, most improved.
- **CSV export/import.** Data portability, and a way to bring in existing history —
  imports replay chronologically, so records and the PRs they produced are rebuilt.
  Re-importing a file is idempotent (matching entries are skipped).

## 4. Non-goals

- Workout programming, session logging, or set-by-set training records
- Social feed, leaderboards, followers
- Nutrition, calories, sleep
- Wearable/API integrations (manual entry only)
- Gamification: levels, XP, quests, penalties

## 5. Core concepts

### Record (`PersonalBest`)
A named thing the user tracks. Uniquely identified by **(user, category, name)**,
so logging "Max Push-ups" again extends the existing record instead of creating a
duplicate. Holds:

| Field | Meaning |
|-------|---------|
| `type` | `EXERCISE` or `BODY_METRIC` |
| `name` | e.g. "Max Push-ups", "Bodyweight" |
| `unit` | Fixed once created — mixing kg and lb in one record is blocked |
| `direction` | `HIGHER`, `LOWER` or `LATEST` — how entries are compared |
| `bestValue` | Current best (or latest, for body metrics) |
| `achievedAt` | When `bestValue` was set |
| `notes`, `verified` | Optional context and a "judged/filmed" flag |

### Entry (`Attempt`)
Every logged value with its date and optional note. Records keep unlimited
history; the detail page shows the 50 most recent entries in the UI.

### Direction (scoring)
How a new value compares to the current best. **Chosen and stored per record**,
because a unit cannot decide it: `SECONDS` means "longer is better" for a plank
hold and "faster is better" for a 40m sprint.

| Category | Scoring | Applies to |
|----------|---------|------------|
| `EXERCISE` | `HIGHER` | reps, weights, distances, holds (plank, wall sit, dead hang) |
| `EXERCISE` | `LOWER` | sprints and runs (40m sprint, 1km / 5km run) |
| `BODY_METRIC` | `LATEST` | measurements — the newest entry is the current value |

Presets carry the right scoring for their record. Custom records fall back to a
unit-based guess (`sec`/`min` → `LOWER`, otherwise `HIGHER`) which the user can
change in the log form, and later in the edit form — flipping it recalculates
which entry is the best.

## 6. User stories

### Logging a PR
As a user, I pick a category (Exercise PR / Body metric), pick a preset or name my
own record, enter the value, unit and date, and save. If it beats my current best
I get told so.

- Presets cover common lifts, holds and runs, and pre-fill a sensible unit
- Choosing a preset that already exists appends to that record
- A conflicting unit is rejected with an explanation rather than silently
  corrupting the record
- Verified toggle for entries I can prove

### Logging another entry
As a user, from a record's page I add a new value without re-picking category,
name or unit. I'm told immediately whether it was a new personal best.

### Reviewing progress
As a user, I open a record and see my current best, the date I set it, how much
I've improved since my first entry, a chart of every entry, and the history list
with the current best marked.

### Correcting mistakes
As a user, I can rename a record, change its unit, edit notes, toggle verified,
delete individual entries, or delete the whole record. Changing a unit
recalculates which entry is the best; deleting an entry backfills the best from
the remaining history.

### Browsing
As a user, I can see all records on one page, filter to Exercise PRs or Body
metrics, and search by name. The dashboard shows totals, records improved this
month, my latest best, and recent entries.

### Body metrics
As a user, I track weight and measurements, and the metrics page charts my most
recently updated metric so I can see the trend.

### Seeing that I'm progressing
As a user, I open the dashboard and immediately see when I last set a PR, how
many I've set this month, and which record improved the most. On any record I can
give myself a target and watch the bar close.

### Keeping my own data
As a user, I can export everything to CSV and import history from a spreadsheet.
Importing a file twice does not duplicate my history.

### Logging a heavy set
As a user, I log "110 kg × 5" and the app shows me the estimated 1RM, so a
5-rep set is comparable with my heavier singles.

## 7. Functional requirements

- R1 — Sign up / sign in with email + password; all data is scoped to the user
- R2 — Creating a record with a name+category that exists appends an entry
- R3 — The stored best updates only when the new value beats it under the record's scoring
- R4 — Units are fixed per record; a mismatched unit returns `409` with guidance
- R5 — Editing a unit or the scoring recomputes the best from the full history
- R6 — Deleting an entry recomputes the best from the remaining history
- R7 — Records are listed newest-best-first with entry counts
- R8 — Records can be filtered by category and searched by name
- R9 — Every record has a progress chart with the best marked
- R10 — Verified records are visually distinguished
- R11 — Empty states on every page point at the next action
- R12 — Removing a record removes its history (cascade delete)
- R13 — Breaking a record writes an achievement; body metrics never do
- R14 — Achievements are append-only and survive edits/deletes of entries
- R15 — A record may carry a target value and date; reaching it is indicated
- R16 — Weighted entries may include reps, producing an Epley 1RM estimate (≤20 reps)
- R17 — Every entry can be exported to CSV and imported back
- R18 — Import replays entries chronologically and is idempotent for entries already present

## 8. Non-functional requirements

- **Correctness:** the domain rules (direction, best computation, validation) live
  in `lib/personal-best.ts` and are unit-tested independently of the UI
- **Data integrity:** `bestValue` is always recomputed from `Attempt` rows on any
  operation that can invalidate it
- **Performance:** every list query is scoped by `userId` and indexed on
  `(userId, type)` and `(attempt.personalBestId, date)`
- **Accessibility:** labelled form fields, `aria-invalid` on failed validation,
  keyboard-reachable controls, `aria-label` on icon-only buttons
- **Mobile-first:** usable one-handed; primary actions reachable on a phone
- **Type safety:** strict TypeScript, no `any` in the domain layer

## 9. Screens

| Screen | Purpose |
|--------|---------|
| `/` | Dashboard: totals, latest best, top records, recent entries |
| `/personal-bests` | All records with search + category filter |
| `/personal-bests/new` | Log a new entry (category, preset, value, unit, scoring, date, notes, verified) |
| `/personal-bests/[id]` | Record detail: current best, chart, add entry, history, edit, delete |
| `/body-metrics` | Body metric overview + chart of the latest metric |
| `/progress` | Pick any record and chart its full history |
| `/login`, `/signup` | Auth |

## 10. API surface

| Endpoint | Method | Behaviour |
|----------|--------|-----------|
| `/api/personal-bests` | GET | List records (`?type=`, `?q=`) with recent history |
| `/api/personal-bests` | POST | Log an entry; creates the record if new; returns `isPersonalBest` |
| `/api/personal-bests/[id]` | GET | One record with full history |
| `/api/personal-bests/[id]` | PATCH | Edit name / unit / scoring / notes / verified; recomputes best when unit or scoring changes |
| `/api/personal-bests/[id]` | DELETE | Delete record + history |
| `/api/personal-bests/[id]/attempts` | POST | Append an entry; returns `isPersonalBest` |
| `/api/attempts/[id]` | DELETE | Delete an entry; rebuilds the record's best |

All endpoints require an authenticated session and scope every query to the
current user. Unauthenticated requests are redirected to `/login` by the proxy.

## 11. Data model

```
User 1───n PersonalBest 1───n Attempt
```

- `PersonalBest.direction` is required — there is no direction that is correct for
a unit in isolation
- `PersonalBest @@unique([userId, type, name])`
- `Attempt` cascades on both `User` and `PersonalBest` deletion
- Indexes: `PersonalBest(userId, type)`, `Attempt(personalBestId, date)`,
  `Attempt(userId, date)`

## 12. Success metrics

- A PR can be logged in under 15 seconds on a phone
- Zero reported cases of a wrong "current best" after edits or deletions
- The dashboard is a sufficient daily check-in without opening any record

## 13. Future ideas (not committed)

- Estimated 1RM from weight × reps entries
- Per-record goals ("beat 50 push-ups") with on-chart target lines
- Achievement history log (every time a record was broken)
- CSV export / import
- Photo or video evidence attached to a verified entry
