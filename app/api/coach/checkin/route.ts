import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, type SessionUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/groq";
import { CHECKIN_JSON_SCHEMA } from "@/lib/plan-schema";
import { planToHtml, baselineCard } from "@/lib/onboarding-plan";
import { buildPerformanceReport } from "@/lib/coach";
import { parsePlan } from "@/lib/session";

/**
 * POST /api/coach/checkin — the weekly coach review. Reads the last two weeks
 * of logged sessions and PRs, then regenerates the plan around what actually
 * happened (missed days compress, stalled lifts progress, easy weeks ramp up).
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userRecord, currentPlan] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { fitnessGoal: true, experienceLevel: true, equipment: true, injuries: true, timezone: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { planJson: true, baselineJson: true },
    }),
  ]);

  if (!currentPlan) {
    return NextResponse.json({ error: "No current plan — complete onboarding first" }, { status: 400 });
  }

  const since = new Date(Date.now() - 14 * 86400_000);
  const report = await buildPerformanceReport(prisma, user.id, since);
  const plan = parsePlan(currentPlan.planJson);

  const goal = userRecord?.fitnessGoal ?? "general_fitness";
  const experience = userRecord?.experienceLevel ?? "intermediate";
  const equipment = userRecord?.equipment ?? "bodyweight";
  const injuries = userRecord?.injuries ?? "";

  const systemPrompt = `You are a personal trainer reviewing one client's week and adjusting their program. Be decisive and specific: change loads, reps or exercise selection based on the data, do not just rewrite the same plan.`;
  const userPrompt = `My goal: ${goal}. Experience: ${experience}. Equipment: ${equipment}.${injuries ? ` Injuries to work around: ${injuries}.` : ""}

My current plan (JSON):
${JSON.stringify(plan?.weeklySchedule ?? [], null, 1)}

My actual performance over the last 2 weeks:
${report}

Write next week's plan in the same JSON schema below. Rules:
- If adherence was low (missed/unfinished sessions), shorten sessions and lower total volume — a plan that gets done beats an ambitious one that doesn't.
- If lifts stalled or RPE ran hot (9+), include a deload or drop a set per exercise.
- If everything felt easy and PRs fell, progress the loads or add a set.
- Keep the exercise names consistent with the current plan so progress stays comparable, unless an exercise must be swapped (injury, equipment).
- The summary field: 2-3 sentences to the client on what changed and why.
- weeklySchedule must cover all 7 days, mainWorkout must not be empty except on rest/recovery days (use [] then), warmUp/cooldown/rpe/notes must be present (use empty strings/arrays when not applicable).

Schema:
${JSON.stringify(CHECKIN_JSON_SCHEMA.schema, null, 2)}`;

  try {
    const raw = await chatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, maxTokens: 4096, jsonSchema: CHECKIN_JSON_SCHEMA },
    );

    const newPlan = JSON.parse(raw) as Parameters<typeof planToHtml>[0] & { summary: string };

    let baselineHtml = "";
    if (currentPlan.baselineJson) {
      try {
        const baseline = JSON.parse(currentPlan.baselineJson) as {
          assessments: Array<{ name: string; value: number; unit: string }>;
        };
        baselineHtml = baselineCard(baseline);
      } catch {
        baselineHtml = "";
      }
    }

    const created = await prisma.trainingPlan.create({
      data: {
        userId: user.id,
        goal: newPlan.goal,
        experience: newPlan.experience,
        equipment: newPlan.equipment,
        injuries: injuries || null,
        source: "checkin",
        summary: newPlan.summary ?? null,
        planJson: JSON.stringify(newPlan),
        planHtml: planToHtml({ ...newPlan, _baselineHtml: baselineHtml }),
        baselineJson: currentPlan.baselineJson,
      },
      select: { id: true, summary: true, planHtml: true, updatedAt: true },
    });

    return NextResponse.json({ plan: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Check-in failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
