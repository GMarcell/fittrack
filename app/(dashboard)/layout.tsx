import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runQuestFailureSweep } from "@/lib/quest-sweep";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  const onboardingCount = await prisma.onboardingResponse.count({
    where: { userId: user.id },
  });

  if (onboardingCount === 0) {
    redirect("/onboarding");
  }

  await runQuestFailureSweep(user.id);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg text-foreground">FitTrack</span>
          <Link
            href="/sessions"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sessions
          </Link>

          <Link
            href="/goals"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Goals
          </Link>
          <Link
            href="/quests"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Quests
          </Link>
        </div>
        <Button asChild size="sm">
          <Link href="/sessions/new">Log Session</Link>
        </Button>
      </nav>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
