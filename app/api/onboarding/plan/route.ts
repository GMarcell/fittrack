import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/groq";
import { ASSESSMENT_EXERCISES } from "@/lib/onboarding";
import { planToHtml, baselineCard } from "@/lib/onboarding-plan";
import { PLAN_JSON_SCHEMA } from "@/lib/plan-schema";
import { z } from "zod";

const schema = z.object({
  exerciseIds: z.array(z.string().min(1)).min(1),
});

function assessmentResults(userId: string, exerciseIds: string[]) {
  return prisma.personalBest.findMany({
    where: {
      userId,
      type: "EXERCISE",
      name: { in: exerciseIds.map((id) => ASSESSMENT_EXERCISES.find((e) => e.id === id)?.name).filter((n): n is NonNullable<typeof n> => n !== undefined) },
    },
    orderBy: { name: "asc" },
    select: { name: true, bestValue: true, unit: true },
  });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Reconstruct the user's onboarding choices + assessment numbers.
  // We store goal/experience/equipment/injuries on the user (added as fields below)
  // and read assessment PBs from the DB.
  const [userRecord, assessments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        fitnessGoal: true,
        experienceLevel: true,
        equipment: true,
        injuries: true,
      },
    }),
    assessmentResults(user.id, parsed.data.exerciseIds),
  ]);

  const goal = userRecord?.fitnessGoal ?? "general_fitness";
  const experience = userRecord?.experienceLevel ?? "intermediate";
  const equipment = userRecord?.equipment ?? "bodyweight";
  const injuries = userRecord?.injuries ?? "";

  const assessmentsByUnit: Record<string, { value: number; unit: string }> = {};
  for (const a of assessments) {
    assessmentsByUnit[a.name] = { value: a.bestValue, unit: a.unit };
  }

  const assessmentSummary = Object.entries(assessmentsByUnit)
    .map(([name, v]) => `${name}: ${v.value} ${v.unit}`)
    .join(" · ");

  // Plain-language baseline the plan notes can reference.
  const baselineSummary =
    assessmentSummary.length > 0
      ? `My current numbers are: ${assessmentSummary}.`
      : "I haven't done the fitness checks yet, so I have no baseline numbers.";

  const systemPrompt = `You are a personal trainer helping one client.`;
  const userPrompt = `Here is my onboarding context:\n\n- Goal: ${goal}\n- Experience level: ${experience}\n- Equipment: ${equipment}\n${injuries ? `- Injuries / things to work around: ${injuries}` : ""}\n${baselineSummary}\n\nPlease write a weekly training plan for me. Return ONLY a JSON object matching this exact schema — no markdown, no explanation before or after:\n\n${JSON.stringify(PLAN_JSON_SCHEMA.schema, null, 2)}\n\nRules:\n- 3–5 days of structured sessions; the rest are rest or light recovery days.\n- Match the plan to the goal and experience level. Beginners get simpler sessions and more rest.\n- Use the exercises and equipment the client has access to.\n- Give sets, reps and an RPE where it makes sense; for endurance, use distance/time instead of reps.\n- Keep it realistic and progressive — a first week, not a peak week.\n- Include a short warm-up and cool-down per session.\\n- Tag every exercise with the muscleGroup it primarily trains.\n- The notes field should be 2–4 sentences of coaching advice.`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.2,
        maxTokens: 4096,
        jsonSchema: PLAN_JSON_SCHEMA,
      },
    );

    const parsedPlan = JSON.parse(raw) as { weeklySchedule: unknown[]; notes: string; goal: string; experience: string; equipment: string };

    // Build the baseline block from the assessment numbers we just used.
    const baseline = {
      assessments: Object.entries(assessmentsByUnit).map(([name, v]) => ({
        name,
        value: v.value,
        unit: v.unit,
      })),
    };
    const baselineHtml = baselineCard({
      assessments: Object.entries(assessmentsByUnit).map(([name, v]) => ({
        name,
        value: v.value,
        unit: v.unit,
      })),
    });
    const fullPlan = Object.assign(parsedPlan, { _baselineHtml: baselineHtml }) as Parameters<typeof planToHtml>[0] & { _baselineHtml: string };

    // Persist the generated plan; previous plans stay as history.
    await prisma.trainingPlan.create({
      data: {
        userId: user.id,
        goal: parsedPlan.goal,
        experience: parsedPlan.experience,
        equipment: parsedPlan.equipment,
        injuries: injuries || null,
        source: "onboarding",
        planJson: JSON.stringify(parsedPlan),
        planHtml: planToHtml(fullPlan),
        baselineJson: JSON.stringify(baseline),
      },
    }).catch(() => {});

    // Mark onboarding complete so the dashboard stops redirecting here.
    await prisma.user.update({
      where: { id: user.id },
      data: { onboardingCompleted: true },
    }).catch(() => {});

    return NextResponse.json(
      {
        planHtml: planToHtml(fullPlan),
        baselineJson: JSON.stringify(baseline),
      },
      { status: 200 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Plan generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
