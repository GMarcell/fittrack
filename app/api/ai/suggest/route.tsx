import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatType, QuestStatus } from "@prisma/client";
import Groq from "groq-sdk";

const STAT_LABELS: Record<StatType, string> = {
  STR: "Strength",
  END: "Endurance",
  AGI: "Agility",
  SPD: "Speed",
  PWR: "Power",
  FLX: "Flexibility",
  VIT: "Vitality",
  DSC: "Discipline",
};

export async function POST() {
  const user = await getCurrentUser();

  const [stats, recentSessions, activeGoals] = await Promise.all([
    prisma.stat.findMany({ where: { userId: user.id } }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 14,
      include: { activityType: true },
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { priority: "asc" },
    }),
  ]);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GROQ_API_KEY not configured" },
      { status: 500 },
    );
  }

  const statSummary = [...stats]
    .sort((a, b) => a.value - b.value)
    .map(
      (s) => `${STAT_LABELS[s.type]} (${s.type}): ${Math.round(s.value)}/100`,
    )
    .join("\n");

  const sessionSummary = recentSessions
    .map(
      (s) =>
        `${new Date(s.date).toISOString().slice(0, 10)} | ${s.activityType.name} | RPE ${s.rpe ?? "n/a"}`,
    )
    .join("\n");

  const goalSummary = activeGoals
    .map(
      (g) =>
        `${g.name} (${g.priority})${g.targetDate ? `, target: ${new Date(g.targetDate).toISOString().slice(0, 10)}` : ""}`,
    )
    .join("\n");

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

  const prompt = `IMPORTANT: Respond with ONLY a JSON object. No text before or after. No markdown. No explanation. Raw JSON only.

You are "The System" — a Solo Leveling-inspired fitness AI and personal coach.

Current hunter stats (weakest first):
${statSummary}

Recent training (last 14 days):
${sessionSummary || "No recent sessions."}

Active goals:
${goalSummary || "None."}

Today is ${todayName}.

Do two things:
1. Generate a 7-day training plan (Monday–Sunday). Be specific — name the activity, duration, intensity. Start with a 2-sentence rationale.
2. Extract TODAY's workout as 1–3 quests. Target weakest stats. Harder quests = bigger rewards. Gain/penalty ratio must be exactly 3:1.

Respond with this exact JSON structure:
{
  "weeklyPlan": "rationale + day by day plan as one string",
  "todayQuests": [
    {
      "title": "Quest title",
      "description": "1 sentence motivation",
      "targetText": "Specific target e.g. 50 push-ups",
      "rewards": [
        { "type": "STR", "completionValue": 3, "failurePenalty": 1 }
      ]
    }
  ]
}`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
    });

    const text = completion.choices[0]?.message?.content ?? "{}";
    console.log("Raw AI response:", text);

    const clean = text.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found:", clean);
      return NextResponse.json(
        { error: "AI returned invalid format" },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      weeklyPlan: string;
      todayQuests: {
        title: string;
        description: string;
        targetText: string;
        rewards: {
          type: StatType;
          completionValue: number;
          failurePenalty: number;
        }[];
      }[];
    };

    console.log("Parsed quests count:", parsed.todayQuests?.length);

    // Delete existing OFFERED quests for today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    await prisma.quest.deleteMany({
      where: {
        userId: user.id,
        status: QuestStatus.OFFERED,
        date: { gte: todayStart },
      },
    });

    // Create new quests
    const quests = await Promise.all(
      (parsed.todayQuests ?? []).map((q) =>
        prisma.quest.create({
          data: {
            userId: user.id,
            date: new Date(),
            title: q.title,
            description: q.description,
            targetText: q.targetText,
            status: QuestStatus.OFFERED,
            rewards: {
              create: q.rewards.map((r) => ({
                type: r.type,
                completionValue: r.completionValue,
                failurePenalty: r.failurePenalty,
              })),
            },
          },
          include: { rewards: true },
        }),
      ),
    );

    return NextResponse.json({
      suggestion: parsed.weeklyPlan,
      quests,
    });
  } catch (err) {
    console.error("Groq error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }
}
