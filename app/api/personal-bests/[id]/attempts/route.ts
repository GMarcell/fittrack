import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  attemptInputSchema,
  type Direction,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";
import { logEntry } from "@/lib/personal-best-service";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/personal-bests/[id]/attempts
 * Appends an entry to an existing record and promotes it when it is a new best.
 */
export async function POST(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await prisma.personalBest.findFirst({
    where: { id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = attemptInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { value, date, reps, notes } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const logged = await logEntry(
      tx,
      {
        id: existing.id,
        userId: user.id,
        unit: existing.unit as PersonalBestUnitValue,
        direction: existing.direction as Direction,
        bestValue: existing.bestValue,
      },
      { value, date, notes, reps },
    );

    const personalBest = await tx.personalBest.findUnique({
      where: { id: existing.id },
      include: { attempts: { orderBy: { date: "desc" } } },
    });

    return { personalBest, ...logged };
  });

  return NextResponse.json(
    {
      personalBest: result.personalBest,
      isPersonalBest: result.isPersonalBest,
      previousValue: result.previousValue,
    },
    { status: 201 },
  );
}
