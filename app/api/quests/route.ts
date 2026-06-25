import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const createQuestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  targetText: z.string().min(1),
  rewards: z
    .array(
      z.object({
        type: z.enum(["STR", "END", "AGI", "SPD", "PWR", "FLX", "VIT", "DSC"]),
        completionValue: z.number().min(1).max(5),
        failurePenalty: z.number().min(0).max(2),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();
  const parsed = createQuestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const quest = await prisma.quest.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      targetText: parsed.data.targetText,
      status: "OFFERED",
      date: new Date(),
      rewards: {
        create: parsed.data.rewards,
      },
    },
    include: { rewards: true },
  });

  return NextResponse.json(quest, { status: 201 });
}
