# API Reference

All API routes require authentication (except signup and NextAuth handler). Unauthenticated requests return a 401.

---

## Authentication

### `POST /api/auth/signup`

Create a new user account.

**Body:**
```json
{
  "name": "Your Name",
  "email": "you@example.com",
  "password": "min-6-chars"
}
```

**Response:** `201 { "success": true }`

### `POST /api/auth/signin` (NextAuth)

Handled by NextAuth's `[...nextauth]` catch-all route.

---

## Sessions

### `GET /api/sessions`

List all sessions for the current user, ordered by date descending.

**Query params:** `?goalId=xxx&activityTypeId=yyy` (filters)

**Response:** `Session[]` (includes activityType, goal, sessionExercises with exercise)

### `POST /api/sessions`

Create a new session.

**Body:**
```json
{
  "date": "2026-06-25T00:00:00.000Z",
  "activityTypeId": "abc123",
  "goalId": "def456",
  "focus": "Scrum practice",
  "duration": 60,
  "rpe": 7,
  "notes": "Felt good",
  "sessionExercises": [
    { "exerciseId": "ex1", "sets": 3, "reps": 10 }
  ],
  "statBoosts": [
    { "type": "STR", "value": 2 },
    { "type": "END", "value": 1 }
  ]
}
```

Stat boosts are optional (max 2, values 1–3). When provided, they increment the corresponding stat and create StatHistory entries.

**Response:** `201` Created session object

### `PATCH /api/sessions/[id]`

Update a session.

### `DELETE /api/sessions/[id]`

Delete a session.

---

## Quests

### `GET /api/quests/today`

Get today's quests. Auto-generates 3 quests via AI if none exist for today.

**Response:** `Quest[]` (includes rewards)

### `POST /api/quests/generate`

Force-regenerate today's quests. Deletes any existing OFFERED quests for today first.

### `POST /api/quests`

Create a custom quest manually.

**Body:**
```json
{
  "title": "Morning Run",
  "description": "Build endurance",
  "targetText": "Run 5km without stopping",
  "rewards": [
    { "type": "END", "completionValue": 3, "failurePenalty": 1 }
  ]
}
```

Max 3 rewards per quest. Gain/penalty ratio should be 3:1.

### `POST /api/quests/[id]/accept`

Accept a quest (changes status from OFFERED → PENDING).

### `POST /api/quests/[id]/complete`

Complete a quest. Applies stat gains and creates StatHistory entries.

**Body (optional):** `{ "sessionId": "xyz" }` to link to a session.

### `GET /api/quests/log`

Get quest history, ordered by date descending.

---

## Goals

### `GET /api/goals`

List goals.

**Query params:** `?status=active|archived|all` (default: active)

### `POST /api/goals`

Create a goal.

**Body:**
```json
{
  "name": "Rugby competition prep",
  "priority": "PRIMARY",
  "targetDate": "2026-09-01T00:00:00.000Z",
  "notes": "Optional notes"
}
```

### `DELETE /api/goals/[id]`

Delete a goal.

### `POST /api/goals/[id]/archive`

Archive a goal (sets status to ARCHIVED + sets archivedAt).

---

## Benchmarks

### `GET /api/benchmarks`

List benchmarks. Optionally filter by metric.

**Query params:** `?metric=Max+Push-ups`

**Response:**
```json
{
  "benchmark": [...],
  "standards": [...]  // Only if metric provided
}
```

### `POST /api/benchmarks`

Create a benchmark entry.

**Body:**
```json
{
  "metric": "Max Push-ups",
  "value": 35,
  "unit": "REPS",
  "date": "2026-06-25T00:00:00.000Z"
}
```

---

## Stats

### `GET /api/stats/history`

Get stat change history.

**Query params:** `?type=STR` (optional, returns all stats if omitted)

---

## AI

### `POST /api/ai/suggest`

Generate a 7-day training plan and 1–3 quests for today. Requires `GROQ_API_KEY` environment variable.

**Response:**
```json
{
  "suggestion": "Weekly plan text...",
  "quests": [...]
}
```

---

## Onboarding

### `POST /api/onboarding`

Submit onboarding responses. Each response maps to stat starting values (range: 12–38). Missing stats default to 15.

**Body:**
```json
{
  "responses": [
    { "questionKey": "max_pushups", "rawAnswer": "C" },
    { "questionKey": "five_k_run", "rawAnswer": "B" }
  ]
}
```

### `GET /api/onboarding/status`

Check if user has completed onboarding.

---

## Cron

### `GET /api/cron/quest-sweep`

**Protected endpoint.** Requires `Authorization: Bearer <CRON_SECRET>` header.

Finds all PENDING quests past their day boundary and marks them as FAILED, applying stat penalties and creating StatHistory entries.
