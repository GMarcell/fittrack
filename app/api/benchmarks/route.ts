import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createBenchmarkSchema } from "@/lib/validation";
import { StatType } from "@prisma/client";

// Maps a benchmark metric to which stat it affects
const BENCHMARK_STAT_MAP: Record<string, StatType> = {
  "Max Push-ups": StatType.STR,
  "Max Pull-ups": StatType.STR,
  "40m Sprint": StatType.SPD,
  "5km Run": StatType.END,
  "Max Squats": StatType.STR,
  "Plank Hold": StatType.END,
};

// Maps a benchmark value to a 0-100 stat score
function benchmarkToStatScore(metric: string, value: number): number | null {
  const scales: Record<string, { min: number; max: number }> = {
    "Max Push-ups": { min: 0, max: 80 },
    "Max Pull-ups": { min: 0, max: 30 },
    "40m Sprint": { min: 9, max: 4.5 }, // lower is better
    "5km Run": { min: 45, max: 18 }, // lower is better
    "Max Squats": { min: 0, max: 100 },
    "Plank Hold": { min: 0, max: 300 }, // seconds
  };

  const scale = scales[metric];
  if (!scale) return null;

  const { min, max } = scale;

  // Handle inverted scales (lower = better, e.g. sprint time)
  if (min > max) {
    const clamped = Math.min(Math.max(value, max), min);
    return Math.round(((min - clamped) / (min - max)) * 100);
  }

  const clamped = Math.min(Math.max(value, min), max);
  return Math.round(((clamped - min) / (max - min)) * 100);
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric") ?? undefined;

  const benchmarks = await prisma.benchmark.findMany({
    where: { userId: user.id, metric },
    orderBy: { date: "asc" },
  });

  const standards = metric
    ? await prisma.fitnessStandard.findMany({ where: { metric } })
    : [];

  return NextResponse.json({ benchmarks, standards });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const body = await req.json();
  const parsed = createBenchmarkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const benchmark = await prisma.benchmark.create({
    data: { ...parsed.data, userId: user.id },
  });

  // Auto-correct stat if this benchmark maps to one
  const statType = BENCHMARK_STAT_MAP[parsed.data.metric];
  const newScore = benchmarkToStatScore(parsed.data.metric, parsed.data.value);

  if (statType && newScore !== null) {
    const currentStat = await prisma.stat.findUnique({
      where: { userId_type: { userId: user.id, type: statType } },
    });

    if (currentStat) {
      // Blend: 40% onboarding/history, 60% real benchmark evidence
      const blended = Math.round(currentStat.value * 0.4 + newScore * 0.6);
      const delta = blended - currentStat.value;

      if (Math.abs(delta) >= 1) {
        await prisma.$transaction([
          prisma.stat.update({
            where: { userId_type: { userId: user.id, type: statType } },
            data: { value: blended },
          }),
          prisma.statHistory.create({
            data: {
              userId: user.id,
              type: statType,
              delta,
              reason: `Benchmark logged: ${parsed.data.metric} (${parsed.data.value}) → stat recalibrated`,
            },
          }),
        ]);
      }
    }
  }

  return NextResponse.json(benchmark, { status: 201 });
}
