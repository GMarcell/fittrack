import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  QUESTIONS,
  getBandValue,
  type QuestionKey,
  type AnswerBand,
} from "@/lib/onboarding";
import { StatType } from "@prisma/client";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const { responses } = await req.json();

  // Accumulate mapped values per stat
  const statAccumulator: Record<string, number[]> = {};

  const onboardingRows = [];

  for (const { questionKey, rawAnswer } of responses) {
    const question = QUESTIONS.find((q) => q.key === questionKey);
    if (!question) continue;

    const mappedValue = getBandValue(
      questionKey as QuestionKey,
      rawAnswer as AnswerBand,
    );

    for (const stat of question.stats) {
      if (!statAccumulator[stat]) statAccumulator[stat] = [];
      statAccumulator[stat].push(mappedValue);

      onboardingRows.push({
        userId: user.id,
        questionKey,
        rawAnswer,
        mappedStat: stat,
        mappedValue,
      });
    }
  }

  // Average values where multiple questions feed the same stat (e.g. STR from pushups + pullups)
  const statEntries = Object.entries(statAccumulator).map(([type, values]) => ({
    userId: user.id,
    type: type as StatType,
    value: values.reduce((a, b) => a + b, 0) / values.length,
  }));

  // Seed any missing stats with a default of 15 (so all 8 always exist)
  const allStats = Object.values(StatType);
  for (const statType of allStats) {
    if (!statEntries.find((s) => s.type === statType)) {
      statEntries.push({ userId: user.id, type: statType, value: 15 });
    }
  }

  // Write everything in a transaction
  await prisma.$transaction([
    prisma.onboardingResponse.createMany({ data: onboardingRows }),
    ...statEntries.map((s) =>
      prisma.stat.upsert({
        where: { userId_type: { userId: user.id, type: s.type } },
        update: { value: s.value },
        create: s,
      }),
    ),
  ]);

  const stats = await prisma.stat.findMany({ where: { userId: user.id } });
  return NextResponse.json({ stats }, { status: 201 });
}
