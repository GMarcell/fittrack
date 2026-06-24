"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Reward = {
  id: string;
  type: string;
  completionValue: number;
  failurePenalty: number;
};

type Quest = {
  id: string;
  title: string;
  targetText: string;
  status: string;
  date: Date | string;
  rewards: Reward[];
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  COMPLETED: {
    label: "Completed",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    icon: "✓",
  },
  FAILED: { label: "Failed", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: "✗" },
  PENDING: {
    label: "In Progress",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    icon: "⏳",
  },
  OFFERED: {
    label: "Offered",
    color: "bg-muted text-muted-foreground",
    icon: "○",
  },
};

function groupByDate(quests: Quest[]) {
  const groups: Record<string, Quest[]> = {};
  quests.forEach((q) => {
    const key = new Date(q.date).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(q);
  });
  return groups;
}

export function QuestLog({ quests }: { quests: Quest[] }) {
  if (quests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground text-sm">
          No quests logged yet — complete your first quest to see history here.
        </CardContent>
      </Card>
    );
  }

  const grouped = groupByDate(quests);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, dayQuests]) => {
        const completed = dayQuests.filter(
          (q) => q.status === "COMPLETED",
        ).length;
        const failed = dayQuests.filter((q) => q.status === "FAILED").length;
        const total = dayQuests.filter(
          (q) => q.status === "COMPLETED" || q.status === "FAILED",
        ).length;

        return (
          <div key={date} className="space-y-2">
            {/* Date header */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{date}</p>
              {total > 0 && (
                <div className="flex gap-1">
                  {completed > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    >
                      {completed} done
                    </Badge>
                  )}
                  {failed > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    >
                      {failed} failed
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Quest cards */}
            <div className="space-y-2">
              {dayQuests.map((quest) => {
                const config =
                  STATUS_CONFIG[quest.status] ?? STATUS_CONFIG.OFFERED;
                return (
                  <div
                    key={quest.id}
                    className="border border-border rounded-lg p-3 flex items-start gap-3 bg-card"
                  >
                    <span className="text-base mt-0.5">{config.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {quest.title}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        🎯 {quest.targetText}
                      </p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {quest.rewards.map((r) => (
                          <span
                            key={r.id}
                            className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              quest.status === "COMPLETED"
                                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                : quest.status === "FAILED"
                                  ? "bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {quest.status === "COMPLETED"
                              ? `+${r.completionValue}`
                              : quest.status === "FAILED"
                                ? `-${r.failurePenalty}`
                                : `+${r.completionValue}`}{" "}
                            {r.type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
