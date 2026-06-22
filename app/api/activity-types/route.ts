import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  const sessions = await prisma.activityType.findMany({
    where: { userId: user.id },
    orderBy: {
      name: "asc",
    },
  });
  return NextResponse.json(sessions);
}
