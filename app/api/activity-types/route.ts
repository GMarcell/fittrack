import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sessions = await prisma.activityType.findMany({
    where: { userId: user.id },
    orderBy: {
      name: "asc",
    },
  });
  return NextResponse.json(sessions);
}
