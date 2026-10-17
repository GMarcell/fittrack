import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WeeklyAdherenceCard({
  planned,
  completed,
  percent,
  streak,
}: {
  planned: number;
  completed: number;
  percent: number;
  streak: number;
}) {
  const hasPlan = planned > 0;
  const remaining = Math.max(0, planned - completed);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base">This week</CardTitle>
        <Link
          href="/workouts"
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Workout history →
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasPlan ? (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="text-sm">
                <span className="text-2xl font-semibold tabular-nums">{completed}</span>{" "}
                <span className="text-muted-foreground">
                  of {planned} planned {planned === 1 ? "session" : "sessions"}
                </span>
              </p>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {percent}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completed === 0
                ? "Nothing logged yet this week — today is a good day to start."
                : remaining === 0
                  ? "Every planned session is done. Anything else is a bonus."
                  : `${remaining} ${remaining === 1 ? "session" : "sessions"} to go — keep the week intact.`}
            </p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Your plan has no training days yet. Finish onboarding to get a weekly menu.
          </p>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2 text-xs">
          <span className="font-medium">
            {streak >= 2 ? `🔥 ${streak}-week streak` : streak === 1 ? "🔥 Week 1" : "No streak yet"}
          </span>
          <Link href="/recap" className="text-muted-foreground underline hover:text-foreground">
            Weekly recap →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
