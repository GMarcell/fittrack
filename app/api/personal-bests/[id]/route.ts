import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updatePersonalBestSchema } from "@/lib/personal-best";
import { recomputeBest } from "@/lib/personal-best-service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const personalBest = await prisma.personalBest.findFirst({
    where: { id, userId: user.id },
    include: {
      attempts: { orderBy: { date: "desc" } },
      achievements: { orderBy: { date: "desc" } },
    },
  });

  if (!personalBest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(personalBest);
}

export async function PATCH(req: Request, { params }: RouteContext) {
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
  const parsed = updatePersonalBestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updated = await tx.personalBest.update({
        where: { id },
        data: {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.unit === undefined ? {} : { unit: input.unit }),
          ...(input.direction === undefined
            ? {}
            : { direction: input.direction }),
          ...(input.notes === undefined ? {} : { notes: input.notes }),
          ...(input.verified === undefined ? {} : { verified: input.verified }),
          ...(input.targetValue === undefined
            ? {}
            : { targetValue: input.targetValue }),
          ...(input.targetDate === undefined
            ? {}
            : { targetDate: input.targetDate }),
        },
      });

      // A changed unit or scoring changes what "best" means, so rebuild it.
      const scoringChanged =
        input.direction !== undefined && input.direction !== existing.direction;
      const unitChanged = input.unit !== undefined && input.unit !== existing.unit;

      if (scoringChanged || unitChanged) {
        return (await recomputeBest(tx, id)) ?? updated;
      }

      return updated;
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already track a record with that name." },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
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

  await prisma.personalBest.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
