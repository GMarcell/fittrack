import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baselineCard } from "@/lib/onboarding-plan";
import { CoachCheckinButton } from "@/components/coach/coach-checkin-button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Training plan — PR Tracker",
};

export default async function TrainingPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [plan, history] = await Promise.all([
    prisma.trainingPlan.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        planHtml: true,
        baselineJson: true,
        goal: true,
        experience: true,
        equipment: true,
        source: true,
        summary: true,
        updatedAt: true,
      },
    }),
    prisma.trainingPlan.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      skip: 1,
      take: 8,
      select: { id: true, goal: true, source: true, summary: true, createdAt: true },
    }),
  ]);

  let baselineHtml = "";
  if (plan?.baselineJson) {
    try {
      const baseline = JSON.parse(plan.baselineJson) as {
        assessments: Array<{ name: string; value: number; unit: string }>;
      };
      baselineHtml = baselineCard({ assessments: baseline.assessments });
    } catch {
      baselineHtml = "";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Training plan</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Your weekly training menu. Regenerate it anytime from the onboarding flow or when your goals change.
        </p>
      </div>

      {plan ? (
        <div className="space-y-4">
          {baselineHtml && (
            <div className="whitespace-pre-wrap text-sm" dangerouslySetInnerHTML={{ __html: baselineHtml }} />
          )}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="text-base">Current plan</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {plan.goal} · {plan.experience} · {plan.equipment}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {plan.summary && (
                <p className="mb-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                  <span className="font-medium">Coach: </span>
                  {plan.summary}
                </p>
              )}
              <div
                className="max-h-[70svh] overflow-y-auto whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ __html: plan.planHtml }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Need an adjustment?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                The coach reads your last two weeks of logged sessions and rewrites next week around how it actually went — missed days compress the plan, easy weeks progress the loads.
              </p>
              <CoachCheckinButton />
            </CardContent>
          </Card>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan history</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {history.map((h) => (
                  <Link
                    key={h.id}
                    href={`/training-plan/${h.id}`}
                    className="block rounded-lg border border-border px-3 py-2 text-xs transition-colors hover:bg-accent/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {h.source === "checkin" ? "Coach check-in" : "Onboarding plan"} — {h.goal}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {h.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </span>
                    </div>
                    {h.summary && (
                      <p className="mt-1 line-clamp-2 text-muted-foreground">{h.summary}</p>
                    )}
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No plan yet. Finish the first-login assessment to generate one.
            </p>
            <div className="mt-4 flex justify-center">
              <Button asChild size="lg">
                <Link href="/onboarding">Start the assessment</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/onboarding/test">Regenerate plan</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/onboarding/goal">Change goals / equipment</Link>
        </Button>
      </div>
    </div>
  );
}
