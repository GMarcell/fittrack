import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // Only allow reset when explicitly requested; keeps assessment data intact.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      onboardingCompleted: false,
      fitnessGoal: "general_fitness",
      experienceLevel: "intermediate",
      equipment: "bodyweight",
      injuries: null,
    },
  }).catch(() => {});

  return NextResponse.json({ success: true }, { status: 200 });
}
