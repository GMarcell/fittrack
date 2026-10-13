import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PersonalBestList } from "@/components/personal-bests/personal-best-list";
import { PersonalBestFilters } from "@/components/personal-bests/personal-best-filters";
import { ImportExport } from "@/components/personal-bests/import-export";
import {
  PERSONAL_BEST_TYPES,
  type PersonalBestTypeValue,
} from "@/lib/personal-best";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Personal Bests — PR Tracker",
};

export default async function PersonalBestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; new?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const rawType = params.type;
  const type: PersonalBestTypeValue | "ALL" =
    rawType && (PERSONAL_BEST_TYPES as readonly string[]).includes(rawType)
      ? (rawType as PersonalBestTypeValue)
      : "ALL";
  const query = (params.q ?? "").trim();

  const where: Prisma.PersonalBestWhereInput = { userId: user.id };
  if (type !== "ALL") where.type = type;
  if (query) where.name = { contains: query, mode: "insensitive" };

  const records = await prisma.personalBest.findMany({
    where,
    orderBy: [{ achievedAt: "desc" }, { name: "asc" }],
    include: {
      attempts: {
        orderBy: { date: "desc" },
        take: 12,
        select: { value: true, date: true },
      },
      _count: { select: { attempts: true, achievements: true } },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Personal bests</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {records.length} record{records.length === 1 ? "" : "s"}
            {query ? ` matching “${query}”` : ""}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/personal-bests/new" transitionTypes={["nav-forward"]}>
            + Log PR
          </Link>
        </Button>
      </div>

      {params.new === "1" && (
        <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary">
          🎉 New personal best recorded!
        </p>
      )}

      <PersonalBestFilters activeType={type} query={query} />

      <ImportExport />

      <PersonalBestList
        personalBests={records}
        emptyMessage={
          query || type !== "ALL"
            ? "No records match this filter."
            : "You have not logged any personal bests yet."
        }
      />
    </div>
  );
}
