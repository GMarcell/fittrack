import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  const count = await prisma.onboardingResponse.count({
    where: { userId: user.id },
  });
  return NextResponse.json({ completed: count > 0 });
}
