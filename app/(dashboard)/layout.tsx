import Link from "next/link";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runQuestFailureSweep } from "@/lib/quest-sweep";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

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
      {/* Top nav — desktop */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40" style={{ viewTransitionName: "nav-header" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base text-foreground">FitTrack</span>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/"
              transitionTypes={["nav-back"]}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Dashboard
            </Link>
            <Link
              href="/sessions"
              transitionTypes={["nav-forward"]}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Sessions
            </Link>
            <Link
              href="/quests"
              transitionTypes={["nav-forward"]}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Quests
            </Link>
            <Link
              href="/goals"
              transitionTypes={["nav-forward"]}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Goals
            </Link>
            <Link
              href="/stats"
              transitionTypes={["nav-forward"]}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-accent"
            >
              Stats
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sessions/new" transitionTypes={["nav-forward"]}>Log Session</Link>
            </Button>
            <LogoutButton />
          </div>

          {/* Mobile: just log session + logout */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sessions/new" transitionTypes={["nav-forward"]}>+ Log</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-md border-t border-border sm:hidden z-50">
        <div className="grid grid-cols-5 h-14">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">⊞</span>
            <span className="text-[10px]">Home</span>
          </Link>
          <Link
            href="/quests"
            transitionTypes={["nav-forward"]}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">⚔</span>
            <span className="text-[10px]">Quests</span>
          </Link>
          <Link
            href="/sessions/new"
            transitionTypes={["nav-forward"]}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">＋</span>
            <span className="text-[10px]">Log</span>
          </Link>
          <Link
            href="/goals"
            transitionTypes={["nav-forward"]}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">◎</span>
            <span className="text-[10px]">Goals</span>
          </Link>
          <Link
            href="/stats"
            transitionTypes={["nav-forward"]}
            className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-lg">↗</span>
            <span className="text-[10px]">Stats</span>
          </Link>
        </div>
      </nav>

      {/* Main content — add bottom padding on mobile for tab bar */}
      <main className="mx-auto max-w-2xl p-4 pb-20 sm:pb-6">
        <ViewTransition
          enter={{
            "nav-forward": "nav-forward",
            "nav-back": "nav-back",
            default: "page-content",
          }}
          exit={{
            "nav-forward": "nav-forward",
            "nav-back": "nav-back",
            default: "page-content",
          }}
          default="page-content"
        >
          {children}
        </ViewTransition>
      </main>
    </div>
  );
}
