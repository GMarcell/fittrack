import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { BenchmarksPageContent } from "./content";

export const metadata: Metadata = {
  title: "Benchmarks — FitTrack",
};

export default async function BenchmarksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [benchmarks, standards] = await Promise.all([
    prisma.benchmark.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 200,
    }),
    prisma.fitnessStandard.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Benchmarks</h1>
      <BenchmarksPageContent benchmarks={benchmarks} standards={standards} />
    </div>
  );
}
