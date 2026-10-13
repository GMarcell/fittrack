import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/personal-bests/sparkline";
import {
  TYPE_LABELS,
  formatRelativeDays,
  formatValue,
  targetProgress,
  type PersonalBestTypeValue,
  type PersonalBestUnitValue,
} from "@/lib/personal-best";

export type PersonalBestListItem = {
  id: string;
  name: string;
  type: PersonalBestTypeValue;
  unit: PersonalBestUnitValue;
  bestValue: number;
  achievedAt: string | Date;
  verified: boolean;
  targetValue: number | null;
  attempts?: { value: number; date: string | Date }[];
  _count?: { attempts: number; achievements?: number };
};

export function PersonalBestList({
  personalBests,
  emptyMessage = "No records yet.",
}: {
  personalBests: PersonalBestListItem[];
  emptyMessage?: string;
}) {
  if (personalBests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-2xl">🏋️</p>
          <p className="mt-2 text-sm text-muted-foreground">{emptyMessage}</p>
          <Link
            href="/personal-bests/new"
            className="mt-3 inline-block text-sm text-primary underline underline-offset-4"
          >
            Log your first entry
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-2">
      {personalBests.map((pb) => {
        const history = pb.attempts ?? [];
        // History arrives newest-first; a sparkline reads oldest → newest.
        const series = [...history].reverse().map((a) => a.value);
        const lastLogged = history[0]?.date;
        const prs = pb._count?.achievements ?? 0;

        const progress =
          pb.targetValue === null
            ? null
            : targetProgress(pb.bestValue, pb.targetValue);

        return (
          <li key={pb.id}>
            <Link
              href={`/personal-bests/${pb.id}`}
              transitionTypes={["nav-forward"]}
              className="block rounded-xl bg-card ring-1 ring-foreground/10 transition-colors hover:bg-accent/60"
            >
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{pb.name}</p>
                    {pb.verified && <Badge variant="secondary">Verified</Badge>}
                    {prs > 0 && (
                      <Badge variant="outline">
                        {prs} PR{prs === 1 ? "" : "s"}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {TYPE_LABELS[pb.type]}
                    {lastLogged ? ` · logged ${formatRelativeDays(lastLogged)}` : ""}
                    {pb._count ? ` · ${pb._count.attempts} entries` : ""}
                  </p>

                  {progress && (
                    <div className="mt-2 max-w-56">
                      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {progress.achieved
                          ? `Target reached (${formatValue(pb.targetValue!, pb.unit)})`
                          : `${formatValue(progress.remaining, pb.unit)} to target ${formatValue(pb.targetValue!, pb.unit)}`}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {series.length > 1 && <Sparkline values={series} />}
                  <p className="text-base font-semibold tabular-nums">
                    {formatValue(pb.bestValue, pb.unit)}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
