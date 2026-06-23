import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NewSessionForm } from "@/components/sessions/new-session-form";

export default async function NewSessionPage() {
  const user = await getCurrentUser();

  const [activityTypes, goals, exercises] = await Promise.all([
    prisma.activityType.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
    prisma.goal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.exercise.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Log Session</h1>
      <NewSessionForm
        activityTypes={activityTypes}
        goals={goals}
        exercises={exercises}
      />
    </div>
  );
}
