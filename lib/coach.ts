import type { PrismaClient } from "@prisma/client";
import { sessionTonnage } from "@/lib/session";
import { equipmentForPrompt } from "@/lib/onboarding";

/**
 * Builds the plain-text performance report the coach reads during a weekly
 * check-in: what was planned, what actually happened, and how the numbers
 * moved.
 */
export async function buildPerformanceReport(
  prisma: PrismaClient,
  userId: string,
  since: Date,
): Promise<string> {
  const [sessions, attempts, achievements, bodyMetrics] = await Promise.all([
    prisma.workoutSession.findMany({
      where: { userId, date: { gte: since } },
      include: { exercises: { include: { sets: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.attempt.findMany({
      where: { userId, date: { gte: since } },
      include: { personalBest: { select: { name: true, unit: true, bestValue: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.achievement.findMany({
      where: { userId, date: { gte: since } },
      include: { personalBest: { select: { name: true, unit: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.personalBest.findMany({
      where: { userId, type: "BODY_METRIC" },
      select: { name: true, bestValue: true, unit: true, achievedAt: true },
    }),
  ]);

  const lines: string[] = [];

  if (sessions.length === 0) {
    lines.push("Sessions in the last 2 weeks: NONE. The client did not log any workouts.");
  } else {
    lines.push(`Sessions in the last 2 weeks: ${sessions.length} completed, ${sessions.filter((s) => !s.completedAt).length} unfinished.`);
    for (const s of sessions) {
      const day = s.date.toISOString().slice(0, 10);
      const totalSets = s.exercises.reduce((n, e) => n + e.sets.length, 0);
      const detail = s.exercises
        .map((e) => {
          const sets = e.sets.map((st) => (st.weight ? `${st.weight}${(e.unit ?? "kg").toLowerCase()}×${st.reps}${st.rpe ? `@${st.rpe}` : ""}` : `${st.reps} reps`)).join(", ");
          return `${e.name}: ${sets || "no sets"}`;
        })
        .join(" | ");
      lines.push(`- ${day} (${s.sessionType ?? s.planDay ?? "workout"}): ${totalSets} sets, tonnage ${Math.round(sessionTonnage(s.exercises))}. ${detail}`);
      if (s.notes) lines.push(`  notes: ${s.notes}`);
    }
  }

  if (achievements.length > 0) {
    lines.push("New personal bests:");
    for (const a of achievements) {
      lines.push(
        `- ${a.personalBest.name}: ${a.value} ${a.personalBest.unit}${a.previousValue !== null ? ` (previous ${a.previousValue})` : ""} on ${a.date.toISOString().slice(0, 10)}`,
      );
    }
  } else {
    lines.push("New personal bests: none in this window.");
  }

  const lifted = attempts.filter((a) => a.reps && a.estimatedOneRep);
  if (lifted.length > 0) {
    const byName = new Map<string, { first: number; last: number; unit: string }>();
    for (const a of lifted) {
      const prev = byName.get(a.personalBest.name);
      const est = a.estimatedOneRep ?? 0;
      if (!prev) byName.set(a.personalBest.name, { first: est, last: est, unit: a.personalBest.unit });
      else byName.set(a.personalBest.name, { ...prev, last: est });
    }
    lines.push("Estimated 1RM trend (first → last entry in window):");
    for (const [name, v] of byName) {
      const delta = Math.round((v.last - v.first) * 10) / 10;
      lines.push(`- ${name}: ${v.first} → ${v.last} ${v.unit} (${delta >= 0 ? "+" : ""}${delta})`);
    }
  }

  if (bodyMetrics.length > 0) {
    lines.push("Body metrics (latest):");
    for (const b of bodyMetrics) {
      lines.push(`- ${b.name}: ${b.bestValue} ${b.unit} (${b.achievedAt.toISOString().slice(0, 10)})`);
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Chat prompt assembly
// ---------------------------------------------------------------------------

const REPORT_BUDGET = 4000;
const SUMMARY_BUDGET = 800;
const MESSAGE_BUDGET = 2000;
const HISTORY_LIMIT = 20;

const PERSONA = `You are the user's personal trainer in an ongoing chat. You have already read their plan and logged performance below, so never ask them to re-enter data you can see. Be direct and specific: name exercises, loads and reps, and say what to change and why. Keep answers short — a few sentences or a compact list, no preamble. If the data shows they are hurting or stalling, address that before anything else. The chat shows plain text only: never use markdown (no **bold**, no headings, no backticks); write "3x5 @ 80kg" rather than decorating it, and use one short line per point.`;

export type PromptMessage = { role: "system" | "user" | "assistant"; content: string };

/** Hard-caps a block before it goes into the prompt so one long report can't crowd out the chat. */
export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Builds the message list for one coach turn: persona + plan + recent
 * performance as the system prompt, then the last few exchanges, then the
 * new question. `history` must NOT already contain `content`.
 */
export function buildCoachMessages(opts: {
  history: { role: string; content: string }[];
  report: string;
  planSummary: string | null;
  content: string;
  /** Raw stored equipment (comma-separated ids); constrains what the coach may program. */
  equipment?: string | null;
}): PromptMessage[] {
  const { history, report, planSummary, content, equipment } = opts;

  const systemParts = [
    PERSONA,
    `CURRENT PLAN\n${planSummary ? truncate(planSummary, SUMMARY_BUDGET) : "No plan on file — they need to finish onboarding before a program can be adjusted."}`,
    `LOGGED PERFORMANCE (their actual data — context only, never paste it back verbatim)\n${truncate(report, REPORT_BUDGET)}`,
  ];
  if (equipment) {
    systemParts.push(
      `EQUIPMENT AVAILABLE\n${equipmentForPrompt(equipment)} Only program exercises this allows.`,
    );
  }
  const system = systemParts.join("\n\n");

  const turns: PromptMessage[] = history.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: truncate(m.content, MESSAGE_BUDGET),
  }));

  return [
    { role: "system", content: system },
    ...turns,
    { role: "user", content: truncate(content, MESSAGE_BUDGET) },
  ];
}
