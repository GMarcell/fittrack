import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { baselineCard } from "@/lib/onboarding-plan";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Training plan — PR Tracker",
};

export default async function TrainingPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const plan = await prisma.trainingPlan.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      planHtml: true,
      baselineJson: true,
      goal: true,
      experience: true,
      equipment: true,
      updatedAt: true,
    },
  });

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
              <div
                className="max-h-[70svh] overflow-y-auto whitespace-pre-wrap text-sm"
                dangerouslySetInnerHTML={{ __html: plan.planHtml }}
              />
            </CardContent>
          </Card>
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
