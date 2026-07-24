import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { StatType } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // Validate that the type param is a real StatType before using it
  const validType =
    type && Object.values(StatType).includes(type as StatType)
      ? (type as StatType)
      : undefined;

  const history = await prisma.statHistory.findMany({
    where: {
      userId: user.id,
      ...(validType ? { type: validType } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(history);
}
