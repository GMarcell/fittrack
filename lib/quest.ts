import { prisma } from "@/lib/prisma";
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

export async function generateQuestsForUser(userId: string) {
  const [stats, recentSessions, activeGoals] = await Promise.all([
    prisma.stat.findMany({ where: { userId } }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 7,
      include: { activityType: true },
    }),
    prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { priority: "asc" },
    }),
  ]);

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not configured");

  // Sort stats weakest first
  const sortedStats = [...stats].sort((a, b) => a.value - b.value);
  const statSummary = sortedStats
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

  const prompt = `You are "The System" — a Solo Leveling-inspired fitness AI that generates daily quests for a hunter.

Current hunter stats (weakest first — prioritize these):
${statSummary}

Recent training (last 7 days):
${sessionSummary || "No recent sessions."}

Active goals:
${goalSummary || "None."}

Generate 3 daily quests. Rules:
- Prioritize the weakest 2-3 stats
- If recent RPE is high (7+), include at least one recovery/light quest
- Each quest must be specific and completable in one session (e.g. "Do 50 push-ups", "Run 3km", "20 min stretching")
- Scale difficulty: Easy = small reward, Hard = big reward
- Gain/penalty ratio must be 3:1 (e.g. +3 on complete, -1 on fail)

Respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "title": "Quest title",
    "description": "1 sentence motivation",
    "targetText": "Specific target e.g. 50 push-ups",
    "rewards": [
      { "type": "STR", "completionValue": 3, "failurePenalty": 1 }
    ]
  }
]`;

  const groq = new Groq({ apiKey });
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });

  const text = completion.choices[0]?.message?.content ?? "[]";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean) as {
    title: string;
    description: string;
    targetText: string;
    rewards: {
      type: StatType;
      completionValue: number;
      failurePenalty: number;
    }[];
  }[];

  // Get today's date boundary (midnight UTC for now, 5AM local is a v2 refinement)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Delete any existing OFFERED quests for today before regenerating
  await prisma.quest.deleteMany({
    where: {
      userId,
      status: QuestStatus.OFFERED,
      date: { gte: today },
    },
  });

  // Create new quests with rewards
  const quests = await Promise.all(
    parsed.map((q) =>
      prisma.quest.create({
        data: {
          userId,
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

  return quests;
}
