import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  PERSONAL_BEST_TYPES,
  defaultDirection,
  personalBestInputSchema,
  type Direction,
  type PersonalBestTypeValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";
import { logEntry } from "@/lib/personal-best-service";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/personal-bests
 * Query params: `type` (EXERCISE | BODY_METRIC), `q` (name search)
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const q = searchParams.get("q");

  const where: Prisma.PersonalBestWhereInput = { userId: user.id };

  if (type && (PERSONAL_BEST_TYPES as readonly string[]).includes(type)) {
    where.type = type as PersonalBestTypeValue;
  }

  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const personalBests = await prisma.personalBest.findMany({
    where,
    orderBy: [{ achievedAt: "desc" }, { name: "asc" }],
    include: {
      attempts: { orderBy: { date: "desc" }, take: 50 },
      _count: { select: { attempts: true, achievements: true } },
    },
  });

  return NextResponse.json(personalBests);
}

/**
 * POST /api/personal-bests
 *
 * Logs an entry. If no record with the same name/type exists it is created,
 * otherwise the entry is appended to that record's history and the record is
 * promoted when the new value beats the current best.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = personalBestInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const existing = await prisma.personalBest.findUnique({
    where: {
      userId_type_name: {
        userId: user.id,
        type: input.type,
        name: input.name,
      },
    },
  });

  // Guard against mixing units on the same record (e.g. kg vs lb).
  if (existing && existing.unit !== input.unit) {
    return NextResponse.json(
      {
        error: `"${existing.name}" is already tracked in ${existing.unit}. Log it in ${existing.unit} or rename this entry.`,
      },
      { status: 409 },
    );
  }

  const direction: Direction =
    existing?.direction ??
    input.direction ??
    defaultDirection(input.type, input.unit);

  const result = await prisma.$transaction(async (tx) => {
    let recordId: string;

    if (existing) {
      recordId = existing.id;
    } else {
      const created = await tx.personalBest.create({
        data: {
          userId: user.id,
          type: input.type,
          name: input.name,
          unit: input.unit,
          direction,
          bestValue: input.value,
          achievedAt: input.date,
          notes: input.notes,
          verified: input.verified ?? false,
          targetValue: input.targetValue,
          targetDate: input.targetDate,
        },
      });
      recordId = created.id;
    }

    const logged = await logEntry(
      tx,
      {
        id: recordId,
        userId: user.id,
        unit: (existing?.unit ?? input.unit) as PersonalBestUnitValue,
        direction,
        bestValue: existing?.bestValue ?? input.value,
      },
      {
        value: input.value,
        date: input.date,
        notes: input.notes,
        reps: input.reps,
        isFirstEntry: !existing,
      },
    );

    const personalBest = await tx.personalBest.update({
      where: { id: recordId },
      data: {
        ...(input.notes ? { notes: input.notes } : {}),
        ...(input.verified === undefined ? {} : { verified: input.verified }),
        ...(input.targetValue === undefined
          ? {}
          : { targetValue: input.targetValue }),
        ...(input.targetDate === undefined
          ? {}
          : { targetDate: input.targetDate }),
      },
      include: { attempts: { orderBy: { date: "desc" }, take: 50 } },
    });

    return {
      personalBest,
      isPersonalBest: logged.isPersonalBest,
      previousValue: logged.previousValue,
    };
  });

  return NextResponse.json(result, { status: existing ? 200 : 201 });
}
