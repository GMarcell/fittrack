# Database Schema

The app uses PostgreSQL with Prisma ORM. Below is an overview of each model and its relationships.

---

## Models

### User
The central entity. Every piece of data belongs to a user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (cuid) | Primary key |
| `email` | String | Unique |
| `name` | String? | Display name |
| `password` | String | bcrypt hash |
| `timezone` | String | Default "Asia/Jakarta" |

**Relations:** Has many sessions, goals, stats, quests, benchmarks, exercises, activity types, onboarding responses, stat history entries.

### ActivityType
User-defined training categories (e.g. Strength, Cardio, Team Sport).

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | PK |
| `userId` | String | FK → User |
| `name` | String | Unique per user |
| `color` | String? | Optional display color |

### Session
A training session log.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | PK |
| `userId` | String | FK → User |
| `date` | DateTime | When the session occurred |
| `activityTypeId` | String | FK → ActivityType |
| `goalId` | String? | FK → Goal (optional link) |
| `focus` | String? | e.g. "Scrum practice", "Easy run" |
| `duration` | Int? | Minutes |
| `rpe` | Int? | Rate of Perceived Exertion (1–10) |
| `notes` | String? | Free text |

**Relations:** Belongs to user + activity type + optional goal. Has many session exercises. Can be linked to completed quests.

### SessionExercise
Individual exercises performed during a session.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | PK |
| `sessionId` | String | FK → Session |
| `exerciseId` | String | FK → Exercise |
| `sets` | Int? | Number of sets |
| `reps` | Int? | Reps per set |
| `value` | Float? | e.g. weight lifted |
| `notes` | String? | Per-exercise notes |

### Exercise
The exercise library, user-scoped.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | PK |
| `userId` | String | FK → User |
| `name` | String | Unique per user |
| `category` | ExerciseCategory | STRENGTH, CONDITIONING, SKILL, FLEXIBILITY, OTHER |
| `unit` | MetricUnit | REPS, SECONDS, KG, etc. |
| `statTags` | StatType[] | Which stats this exercise targets |

### Goal
Training goals with priority and target dates.

| Field | Type | Notes |
|-------|------|-------|
| `id` | String | PK |
| `userId` | String | FK → User |
| `name` | String | Goal description |
| `priority` | GoalPriority | PRIMARY or SECONDARY |
| `status` | GoalStatus | ACTIVE or ARCHIVED |
| `targetDate` | DateTime? | Optional deadline |
| `notes` | String? | Details |

### Benchmark + FitnessStandard
Benchmarks track your performance on specific metrics. FitnessStandards are reference levels for comparison.

**Benchmark fields:** metric, value, unit, date
**FitnessStandard fields:** metric, unit, age/gender range, level (Beginner/Average/Good/Excellent), value

### Stat
One of 8 hunter stats (STR, END, AGI, SPD, PWR, FLX, VIT, DSC). Each user has one row per stat type (unique constraint on `[userId, type]`).

| Field | Type | Notes |
|-------|------|-------|
| `value` | Float | 0–100 range |

### StatHistory
Audit log of every stat change.

| Field | Type | Notes |
|-------|------|-------|
| `type` | StatType | Which stat changed |
| `delta` | Float | Positive (gain) or negative (loss) |
| `reason` | String | e.g. "Quest completed: Morning Run" |
| `questId` | String? | FK → Quest (optional link) |

### Quest
Daily quests with rewards.

| Field | Type | Notes |
|-------|------|-------|
| `status` | QuestStatus | OFFERED → PENDING → COMPLETED/FAILED |
| `title` | String | Quest name |
| `description` | String? | Motivation text |
| `targetText` | String | Specific target (e.g. "50 push-ups") |
| `acceptedAt` | DateTime? | When user accepted |
| `resolvedAt` | DateTime? | When completed/failed |
| `sessionId` | String? | Link to session if completed via session log |

**Relation:** Has many `QuestStatReward` entries.

### QuestStatReward
Each quest can reward up to 3 different stats.

| Field | Type | Notes |
|-------|------|-------|
| `type` | StatType | Which stat |
| `completionValue` | Float | Gain on completion |
| `failurePenalty` | Float | Loss on failure (3:1 ratio) |

### OnboardingResponse
Records onboarding answers and how they mapped to starting stats.
