import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/groq";
import { buildCoachMessages, buildPerformanceReport } from "@/lib/coach";

const chatSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

/** Renders a stored timestamp for the client, which never builds Dates itself. */
function serializeTime(createdAt: Date, timeZone: string) {
  return createdAt.toLocaleString("en-GB", {
    timeZone,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * POST /api/coach/chat — answers one question using the client's current plan
 * and the last two weeks of logged performance as context. The exchange is
 * stored so the conversation survives a reload.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { content } = parsed.data;
  const timeZone = user.timezone || "Asia/Jakarta";
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [history, planRow] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { role: true, content: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { summary: true },
    }),
  ]);

  const report = await buildPerformanceReport(prisma, user.id, since);

  // Persist the question before asking, so an unanswered message still counts
  // as evidence of when the client last spoke to the coach.
  const question = await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content },
  });

  try {
    const answer = await chatCompletion(
      buildCoachMessages({
        history: history.reverse(),
        report,
        planSummary: planRow?.summary ?? null,
        content,
      }),
      { temperature: 0.5, maxTokens: 1024 },
    );

    const reply = await prisma.chatMessage.create({
      data: { userId: user.id, role: "assistant", content: answer },
    });

    return NextResponse.json({
      message: {
        id: reply.id,
        role: reply.role,
        content: reply.content,
        time: serializeTime(reply.createdAt, timeZone),
      },
    });
  } catch (err) {
    // The UI removes the failed bubble, so drop its row too — otherwise the
    // question resurfaces on reload and is replayed to the model as history.
    await prisma.chatMessage.delete({ where: { id: question.id } });
    const message = err instanceof Error ? err.message : "Coach chat failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
