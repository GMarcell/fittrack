import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/personal-best";

export const metadata: Metadata = { title: "Past plan — PR Tracker" };

type RouteContext = { params: Promise<{ id: string }> };

export default async function PlanHistoryPage({ params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const plan = await prisma.trainingPlan.findFirst({
    where: { id, userId: user.id },
  });
  if (!plan) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Past plan</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {plan.source === "checkin" ? "Coach check-in" : "Onboarding plan"} · generated {formatDate(plan.createdAt)}
        </p>
      </div>

      {plan.summary && (
        <p className="rounded-lg border border-border bg-card px-3 py-2 text-xs">
          <span className="font-medium">Coach: </span>
          {plan.summary}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{plan.goal} · {plan.experience} · {plan.equipment}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="whitespace-pre-wrap text-sm"
            dangerouslySetInnerHTML={{ __html: plan.planHtml }}
          />
        </CardContent>
      </Card>

      <Button variant="outline" asChild>
        <Link href="/training-plan">Back to current plan</Link>
      </Button>
    </div>
  );
}
