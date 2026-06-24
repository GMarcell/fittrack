import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST() {
  const user = await getCurrentUser();

  const [recentSessions, activeGoals] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 14,
      include: { activityType: true, goal: true },
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
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

  const sessionSummary = recentSessions
    .map(
      (s) =>
        `${new Date(s.date).toISOString().slice(0, 10)} | ${s.activityType.name} | RPE ${s.rpe ?? "n/a"} | ${s.focus ?? "no focus noted"}`,
    )
    .join("\n");

  const goalSummary = activeGoals
    .map(
      (g) =>
        `${g.name} (${g.priority})${g.targetDate ? `, target date: ${new Date(g.targetDate).toISOString().slice(0, 10)}` : ""}`,
    )
    .join("\n");

  const prompt = `You are a personal fitness coach. Based on this athlete's recent training history and goals, suggest a balanced 7-day training plan for next week.

Recent sessions (most recent first):
${sessionSummary || "No sessions logged yet."}

Active goals:
${goalSummary || "No active goals set."}

Guidelines:
- If RPE has been trending high (7+), include recovery days
- Prioritize activities relevant to the PRIMARY goal
- Keep it practical and specific — name the activity, duration, and intensity
- Format: start with a 2-sentence rationale, then a day-by-day plan (Monday–Sunday)
- Be concise`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content ?? "";
    return NextResponse.json({ suggestion: text });
  } catch (err) {
    console.error("Groq error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 502 });
  }
}
