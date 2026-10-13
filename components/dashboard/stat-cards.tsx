import { Card, CardContent } from "@/components/ui/card";

export type StatCard = {
  label: string;
  value: string | number;
  hint?: string;
};

export function StatCards({ stats }: { stats: StatCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm">
          <CardContent className="space-y-1">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            {stat.hint && (
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
