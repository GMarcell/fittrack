import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sessions — FitTrack",
};

export default async function SessionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { date: "desc" },
    take: 100,
    include: { activityType: true, goal: true },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sessions</h1>
        <Button asChild size="sm">
          <Link href="/sessions/new">+ Log Session</Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No sessions logged yet.{" "}
            <Link href="/sessions/new" className="underline">
              Log your first one.
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {session.focus ?? session.activityType.name}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{session.activityType.name}</Badge>
                {session.goal && (
                  <Badge variant="outline">{session.goal.name}</Badge>
                )}
                {session.rpe && (
                  <Badge variant="outline">RPE {session.rpe}</Badge>
                )}
                {session.duration && (
                  <Badge variant="outline">{session.duration} min</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
