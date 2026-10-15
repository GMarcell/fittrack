import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { CoachChat, type ChatMessageDto } from "@/components/coach/coach-chat";
import { CoachCheckinButton } from "@/components/coach/coach-checkin-button";

export const metadata: Metadata = { title: "Coach — PR Tracker" };

export default async function CoachPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const timeZone = user.timezone || "Asia/Jakarta";

  const [rows, plan] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, role: true, content: true, createdAt: true },
    }),
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { summary: true },
    }),
  ]);

  const initialMessages: ChatMessageDto[] = rows
    .reverse()
    .map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
      time: m.createdAt.toLocaleString("en-GB", {
        timeZone,
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Coach</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ask about your plan — it already knows what you logged.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          {plan?.summary ? (
            <p className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-medium">Latest plan note: </span>
              {plan.summary}
            </p>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">
              No training plan on file yet — finish onboarding to get one.
            </p>
          )}
          <CoachChat initialMessages={initialMessages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Weekly check-in</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Rewrites next week from your last two weeks of sessions: missed days compress the
            plan, hot RPE triggers a deload, easy weeks progress the loads.
          </p>
          <CoachCheckinButton />
        </CardContent>
      </Card>
    </div>
  );
}
