import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { logEntry } from "@/lib/personal-best-service";
import { computeBest, type Direction } from "@/lib/personal-best";
import { ASSESSMENT_EXERCISES } from "@/lib/onboarding";
import { z } from "zod";

const goalSchema = z.object({
  goal: z.enum(["strength", "hypertrophy", "endurance", "weight_loss", "general_fitness"]),
  experience: z.enum(["beginner", "intermediate", "advanced"]),
  equipment: z.enum(["bodyweight", "dumbbells", "full_gym", "resistance_bands"]),
  injuries: z.string().max(2000).nullable(),
  step: z.literal("goal"),
});

const testSchema = z.object({
  exerciseId: z.string().min(1),
  value: z.coerce.number().positive("Value must be positive"),
  step: z.literal("test"),
});

type Tx = { prisma: typeof prisma };

function exerciseConfig(exerciseId: string) {
  return ASSESSMENT_EXERCISES.find((e) => e.id === exerciseId);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  if (body.step === "goal") {
    const parsed = goalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          fitnessGoal: parsed.data.goal,
          experienceLevel: parsed.data.experience,
          equipment: parsed.data.equipment,
          injuries: parsed.data.injuries ?? null,
          onboardingCompleted: false,
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  }

  if (body.step === "test") {
    const parsed = testSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const exercise = exerciseConfig(parsed.data.exerciseId);
    if (!exercise) {
      return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
    }

    // Upsert the PersonalBest record for this assessment exercise (type = EXERCISE),
    // then log the attempt against it. Bodyweight uses LATEST scoring; everything else
    // uses the exercise's default direction.
    const direction: Direction = exercise.direction;

    return prisma.$transaction(async (tx) => {
      const record = await tx.personalBest.upsert({
        where: {
          userId_type_name: {
            userId: user.id,
            type: "EXERCISE",
            name: exercise.name,
          },
        },
        create: {
          userId: user.id,
          type: "EXERCISE",
          name: exercise.name,
          unit: exercise.unit,
          direction,
          bestValue: 0,
          achievedAt: new Date(),
          verified: true,
        },
        update: {
          unit: exercise.unit,
          direction,
        },
      });

      const previousBest = record.bestValue;

      const result = await logEntry(tx, record, {
        value: parsed.data.value,
        date: new Date(),
        isFirstEntry: previousBest === 0,
      });

      return {
        isPersonalBest: result.isPersonalBest,
        attemptId: result.attemptId,
        previousValue: result.previousValue,
      };
    }).then((data) => NextResponse.json(data, { status: 201 }));
  }

  return NextResponse.json({ error: "Unknown step" }, { status: 400 });
}
