import { PrismaClient, ExerciseCategory, MetricUnit } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Demo user (replace with real auth-created user in production)
  const passwordHash = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "xavior@example.com" },
    update: {},
    create: { email: "xavior@example.com", name: "Xavior", passwordHash },
  });

  // 2. Default activity types
  const activityTypeNames = [
    "Strength",
    "Cardio",
    "Team Sport",
    "Conditioning",
    "Flexibility",
  ];
  const activityTypes: Record<string, string> = {};
  for (const name of activityTypeNames) {
    const at = await prisma.activityType.upsert({
      where: { userId_name: { userId: user.id, name } },
      update: {},
      create: { userId: user.id, name },
    });
    activityTypes[name] = at.id;
  }

  // 3. Default goal (rugby example, optional — user can delete/edit)
  await prisma.goal.upsert({
    where: { id: "seed-goal-rugby" },
    update: {},
    create: {
      id: "seed-goal-rugby",
      userId: user.id,
      name: "Rugby - September competition",
      priority: "PRIMARY",
      targetDate: new Date("2026-09-01"),
    },
  });

  // 4. Starter bodyweight exercise library
  const exercises: {
    name: string;
    category: ExerciseCategory;
    unit: MetricUnit;
  }[] = [
    { name: "Push-ups", category: "STRENGTH", unit: "REPS" },
    { name: "Pull-ups", category: "STRENGTH", unit: "REPS" },
    { name: "Bodyweight Squats", category: "STRENGTH", unit: "REPS" },
    { name: "Plank", category: "CONDITIONING", unit: "SECONDS" },
    { name: "Burpees", category: "CONDITIONING", unit: "REPS" },
    { name: "40m Sprint", category: "CONDITIONING", unit: "SECONDS" },
    { name: "5km Run", category: "CONDITIONING", unit: "MINUTES" },
  ];
  for (const ex of exercises) {
    await prisma.exercise.upsert({
      where: { userId_name: { userId: user.id, name: ex.name } },
      update: {},
      create: { userId: user.id, ...ex },
    });
  }

  // 5. Seeded general fitness standards (sample reference data — expand as needed)
  const standards = [
    {
      metric: "Max Push-ups",
      unit: "REPS" as MetricUnit,
      level: "Beginner",
      value: 10,
    },
    {
      metric: "Max Push-ups",
      unit: "REPS" as MetricUnit,
      level: "Average",
      value: 25,
    },
    {
      metric: "Max Push-ups",
      unit: "REPS" as MetricUnit,
      level: "Good",
      value: 40,
    },
    {
      metric: "Max Push-ups",
      unit: "REPS" as MetricUnit,
      level: "Excellent",
      value: 55,
    },
    {
      metric: "40m Sprint",
      unit: "SECONDS" as MetricUnit,
      level: "Beginner",
      value: 7.0,
    },
    {
      metric: "40m Sprint",
      unit: "SECONDS" as MetricUnit,
      level: "Average",
      value: 6.0,
    },
    {
      metric: "40m Sprint",
      unit: "SECONDS" as MetricUnit,
      level: "Good",
      value: 5.4,
    },
    {
      metric: "40m Sprint",
      unit: "SECONDS" as MetricUnit,
      level: "Excellent",
      value: 5.0,
    },
    {
      metric: "5km Run",
      unit: "MINUTES" as MetricUnit,
      level: "Beginner",
      value: 35,
    },
    {
      metric: "5km Run",
      unit: "MINUTES" as MetricUnit,
      level: "Average",
      value: 28,
    },
    {
      metric: "5km Run",
      unit: "MINUTES" as MetricUnit,
      level: "Good",
      value: 23,
    },
    {
      metric: "5km Run",
      unit: "MINUTES" as MetricUnit,
      level: "Excellent",
      value: 19,
    },
  ];
  for (const s of standards) {
    const existing = await prisma.fitnessStandard.findFirst({
      where: { metric: s.metric, level: s.level },
    });
    if (!existing) {
      await prisma.fitnessStandard.create({ data: s });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
