import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runQuestFailureSweep } from "@/lib/quest-sweep";
import { LogoutButton } from "@/components/logout-button";

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
    <div className="min-h-screen bg-neutral-50">
      {/* Top nav — desktop */}
      <nav className="border-b bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-base">FitTrack</span>

          {/* Desktop links */}
          <div className="hidden sm:flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-neutral-600 hover:text-black"
            >
              Dashboard
            </Link>
            <Link
              href="/sessions"
              className="text-sm text-neutral-600 hover:text-black"
            >
              Sessions
            </Link>
            <Link
              href="/quests"
              className="text-sm text-neutral-600 hover:text-black"
            >
              Quests
            </Link>
            <Link
              href="/goals"
              className="text-sm text-neutral-600 hover:text-black"
            >
              Goals
            </Link>
            <Link
              href="/stats"
              className="text-sm text-neutral-600 hover:text-black"
            >
              Stats
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <Button asChild size="sm">
              <Link href="/sessions/new">Log Session</Link>
            </Button>
            <LogoutButton />
          </div>

          {/* Mobile: just log session + logout */}
          <div className="flex sm:hidden items-center gap-2">
            <Button asChild size="sm">
              <Link href="/sessions/new">+ Log</Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden z-50">
        <div className="grid grid-cols-5 h-14">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-black"
          >
            <span className="text-lg">⊞</span>
            <span className="text-[10px]">Home</span>
          </Link>
          <Link
            href="/quests"
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-black"
          >
            <span className="text-lg">⚔</span>
            <span className="text-[10px]">Quests</span>
          </Link>
          <Link
            href="/sessions/new"
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-black"
          >
            <span className="text-lg">＋</span>
            <span className="text-[10px]">Log</span>
          </Link>
          <Link
            href="/goals"
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-black"
          >
            <span className="text-lg">◎</span>
            <span className="text-[10px]">Goals</span>
          </Link>
          <Link
            href="/stats"
            className="flex flex-col items-center justify-center gap-0.5 text-neutral-500 hover:text-black"
          >
            <span className="text-lg">↗</span>
            <span className="text-[10px]">Stats</span>
          </Link>
        </div>
      </nav>

      {/* Main content — add bottom padding on mobile for tab bar */}
      <main className="mx-auto max-w-2xl p-4 pb-20 sm:pb-6">{children}</main>
    </div>
  );
}
