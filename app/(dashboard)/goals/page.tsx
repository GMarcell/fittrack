import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { GoalsList } from "@/components/goals/goals-list";

export const metadata: Metadata = {
  title: "Goals — FitTrack",
};

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [activeGoals, archivedGoals] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: [{ priority: "asc" }, { targetDate: "asc" }],
    }),
    prisma.goal.findMany({
      where: { userId: user.id, status: "ARCHIVED" },
      orderBy: { archivedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Goals</h1>
      <GoalsList activeGoals={activeGoals} archivedGoals={archivedGoals} />
    </div>
  );
}
