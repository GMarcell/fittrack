import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "password123";

/** Days-ago helper so the seeded history reads as a real progression. */
function daysAgo(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

type Direction = "HIGHER" | "LOWER" | "LATEST";

type SeedRecord = {
  name: string;
  unit: "REPS" | "SECONDS" | "MINUTES" | "KM" | "KG" | "PERCENT" | "CM";
  /** Explicit scoring: a plank hold and a 5km time share units but not scoring. */
  direction: Direction;
  /** Optional goal to demonstrate the target progress bar. */
  targetValue?: number;
  targetInDays?: number;
  /** Oldest → newest. `reps` powers the estimated one-rep max. */
  attempts: { value: number; daysAgo: number; reps?: number }[];
};

const EXERCISE_RECORDS: SeedRecord[] = [
  {
    name: "Max Push-ups",
    unit: "REPS",
    direction: "HIGHER",
    attempts: [
      { value: 28, daysAgo: 90 },
      { value: 34, daysAgo: 60 },
      { value: 41, daysAgo: 30 },
      { value: 47, daysAgo: 6 },
    ],
  },
  {
    name: "Max Pull-ups",
    unit: "REPS",
    direction: "HIGHER",
    attempts: [
      { value: 4, daysAgo: 80 },
      { value: 6, daysAgo: 45 },
      { value: 9, daysAgo: 12 },
    ],
  },
  {
    name: "5km Run",
    unit: "MINUTES",
    direction: "LOWER",
    attempts: [
      { value: 27.5, daysAgo: 70 },
      { value: 26.2, daysAgo: 40 },
      { value: 24.8, daysAgo: 9 },
    ],
  },
  {
    name: "Plank Hold",
    unit: "SECONDS",
    direction: "HIGHER",
    attempts: [
      { value: 95, daysAgo: 50 },
      { value: 120, daysAgo: 21 },
      { value: 142, daysAgo: 3 },
    ],
  },
  {
    name: "Deadlift",
    unit: "KG",
    direction: "HIGHER",
    targetValue: 125,
    targetInDays: 30,
    attempts: [
      { value: 90, reps: 5, daysAgo: 65 },
      { value: 105, reps: 5, daysAgo: 28 },
      { value: 115, reps: 3, daysAgo: 5 },
    ],
  },
];

const BODY_METRICS: SeedRecord[] = [
  {
    name: "Bodyweight",
    unit: "KG",
    direction: "LATEST",
    attempts: [
      { value: 78.4, daysAgo: 60 },
      { value: 77.1, daysAgo: 30 },
      { value: 76.2, daysAgo: 4 },
    ],
  },
  {
    name: "Body Fat %",
    unit: "PERCENT",
    direction: "LATEST",
    attempts: [
      { value: 21.5, daysAgo: 60 },
      { value: 19.8, daysAgo: 30 },
      { value: 18.4, daysAgo: 4 },
    ],
  },
];

/** Mirrors lib/personal-best.ts `computeBest`. */
function bestFor(attempts: { value: number; date: Date }[], direction: Direction) {
  if (direction === "LATEST") {
    return attempts[attempts.length - 1];
  }
  return attempts.reduce((best, attempt) =>
    direction === "LOWER"
      ? attempt.value < best.value
        ? attempt
        : best
      : attempt.value > best.value
        ? attempt
        : best,
  );
}

/** Mirrors lib/personal-best.ts `estimateOneRepMax` (Epley). */
function estimateOneRep(weight: number, reps?: number): number | null {
  if (!reps || reps < 1 || reps > 20 || weight <= 0) return null;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
}

async function main() {
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Lifter",
      password,
    },
  });

  // Start from a clean slate for this user so the seed is idempotent.
  await prisma.attempt.deleteMany({ where: { userId: user.id } });
  await prisma.personalBest.deleteMany({ where: { userId: user.id } });
  await prisma.achievement.deleteMany({ where: { userId: user.id } });

  const groups: { type: "EXERCISE" | "BODY_METRIC"; records: SeedRecord[] }[] = [
    { type: "EXERCISE", records: EXERCISE_RECORDS },
    { type: "BODY_METRIC", records: BODY_METRICS },
  ];

  for (const { type, records } of groups) {
    for (const record of records) {
      const attempts = record.attempts.map((a) => ({
        value: a.value,
        date: daysAgo(a.daysAgo),
        reps: a.reps ?? null,
      }));

      const current = bestFor(attempts, record.direction);

      const personalBest = await prisma.personalBest.create({
        data: {
          userId: user.id,
          type,
          name: record.name,
          unit: record.unit,
          direction: record.direction,
          bestValue: current.value,
          achievedAt: current.date,
          verified: type === "EXERCISE",
          targetValue: record.targetValue ?? null,
          targetDate: record.targetInDays
            ? daysAgo(-record.targetInDays)
            : null,
        },
      });

      await prisma.attempt.createMany({
        data: attempts.map((a) => ({
          userId: user.id,
          personalBestId: personalBest.id,
          value: a.value,
          date: a.date,
          reps: a.reps,
          estimatedOneRep: estimateOneRep(a.value, a.reps ?? undefined),
          isBest: a.value === current.value && a.date === current.date,
        })),
      });

      // Replay the progression so the PR feed and momentum card have real data.
      // Body metrics are measurements, not records, so they never earn a PR.
      if (record.direction !== "LATEST") {
        let previous: number | null = null;
        let best: number | null = null;

        for (const attempt of attempts) {
          const isNewRecord =
            best === null ||
            (record.direction === "LOWER"
              ? attempt.value < best
              : attempt.value > best);

          if (isNewRecord) {
            await prisma.achievement.create({
              data: {
                userId: user.id,
                personalBestId: personalBest.id,
                value: attempt.value,
                previousValue: previous,
                date: attempt.date,
              },
            });
            previous = attempt.value;
            best = attempt.value;
          }
        }
      }
    }
  }

  const [count, prs] = await Promise.all([
    prisma.personalBest.count({ where: { userId: user.id } }),
    prisma.achievement.count({ where: { userId: user.id } }),
  ]);
  console.log(
    `Seeded ${count} personal bests and ${prs} PRs for ${DEMO_EMAIL} (${DEMO_PASSWORD}).`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
