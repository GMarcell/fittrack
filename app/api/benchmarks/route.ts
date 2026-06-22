import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createBenchmarkSchema } from "@/validation/benchmark";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createBenchmarkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const benchmark = await prisma.benchmark.create({
    data: {
      ...parsed.data,
      userId: user?.id ?? "",
    },
  });

  return NextResponse.json(benchmark, { status: 201 });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const metric = searchParams.get("metric"); // string | null
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const benchmark = await prisma.benchmark.findMany({
    where: { userId: user.id, metric: metric ?? undefined },
  });
  const standards = metric
    ? await prisma.fitnessStandard.findMany({ where: { metric } })
    : [];
  return NextResponse.json({ benchmark, standards });
}
