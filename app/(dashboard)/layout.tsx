import Link from "next/link";
import { redirect } from "next/navigation";
import { ViewTransition } from "react";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { DesktopNav, MobileTabs } from "@/components/dashboard/nav-links";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const onboardingCount = await prisma.onboardingResponse.count({
    where: { userId: user.id },
  });

  if (onboardingCount === 0) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav — desktop */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40" style={{ viewTransitionName: "nav-header" }}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base text-foreground">FitTrack</span>

          <DesktopNav />

          <div className="hidden sm:flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sessions/new">Log Session</Link>
            </Button>
            <LogoutButton />
          </div>

          {/* Mobile: just log session + logout */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm">
              <Link href="/sessions/new">+ Log</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <MobileTabs />

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
