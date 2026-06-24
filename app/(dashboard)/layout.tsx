import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-lg">FitTrack</span>
          <Link
            href="/sessions"
            className="text-sm text-neutral-600 hover:text-black"
          >
            Sessions
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
