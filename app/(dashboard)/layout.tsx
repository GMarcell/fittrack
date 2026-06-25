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
    <div className="min-h-screen bg-background">
      <nav className="border-b border-white/5 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 px-6 py-4 flex items-center justify-between shadow-lg shadow-black/30">
        <div className="flex items-center gap-8">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="size-2 rounded-full bg-navy-500 shadow-lg shadow-navy-500/30" />
            <span className="font-bold text-base tracking-tight text-white/90">
              FitTrack
            </span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            <Link
              href="/sessions"
              className="px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200"
            >
              Sessions
            </Link>
            <Link
              href="/goals"
              className="px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200"
            >
              Goals
            </Link>
            <Link
              href="/quests"
              className="px-3 py-1.5 text-sm text-white/50 hover:text-white hover:bg-white/5 rounded-md transition-all duration-200"
            >
              Quests
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link href="/sessions/new">Log Session</Link>
          </Button>
          <LogoutButton />
        </div>
      </nav>
      <main className="mx-auto max-w-2xl p-6">{children}</main>
    </div>
  );
}
