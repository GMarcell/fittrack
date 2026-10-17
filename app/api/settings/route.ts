import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  EQUIPMENT_VALUES,
  parseEquipment,
  serializeEquipment,
} from "@/lib/onboarding";

const settingsSchema = z.object({
  timezone: z.string().trim().min(1).max(64),
  equipment: z.array(z.enum(EQUIPMENT_VALUES)).min(1),
});

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/** PATCH /api/settings — update profile preferences without redoing onboarding. */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  if (!isValidTimezone(parsed.data.timezone)) {
    return NextResponse.json({ error: "Unknown timezone" }, { status: 400 });
  }

  const equipment = serializeEquipment(parsed.data.equipment);
  if (!equipment) {
    return NextResponse.json({ error: "Pick at least one equipment option" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { timezone: parsed.data.timezone, equipment },
    select: { timezone: true, equipment: true },
  });

  return NextResponse.json({
    timezone: updated.timezone,
    equipment: parseEquipment(updated.equipment),
  });
}
