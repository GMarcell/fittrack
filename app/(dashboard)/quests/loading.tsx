import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function QuestsLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-28" />

      <div className="space-y-6">
        {/* Quest day group */}
        {[1, 2].map((group) => (
          <div key={group} className="space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>

            <div className="space-y-2">
              {[1, 2].map((q) => (
                <div
                  key={q}
                  className="border border-border rounded-lg p-3 flex items-start gap-3"
                >
                  <Skeleton className="h-5 w-5 mt-0.5 rounded" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-5 w-20 rounded-full shrink-0" />
                    </div>
                    <Skeleton className="h-3 w-64" />
                    <div className="flex gap-1">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
