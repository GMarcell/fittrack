"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TYPE_LABELS, type PersonalBestTypeValue } from "@/lib/personal-best";

const TABS: { label: string; value: PersonalBestTypeValue | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: TYPE_LABELS.EXERCISE, value: "EXERCISE" },
  { label: TYPE_LABELS.BODY_METRIC, value: "BODY_METRIC" },
];

export function PersonalBestFilters({
  activeType,
  query,
}: {
  activeType: PersonalBestTypeValue | "ALL";
  query: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(query);

  function href(type: PersonalBestTypeValue | "ALL", q: string) {
    const params = new URLSearchParams();
    if (type !== "ALL") params.set("type", type);
    if (q) params.set("q", q);
    const suffix = params.toString();
    return suffix ? `/personal-bests?${suffix}` : "/personal-bests";
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    router.push(href(activeType, search.trim()));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={href(tab.value, search.trim())}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              activeType === tab.value
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <Input
          placeholder="Search records…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search records"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
        {query && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setSearch("");
              router.push(href(activeType, ""));
            }}
          >
            Clear
          </Button>
        )}
      </form>
    </div>
  );
}
