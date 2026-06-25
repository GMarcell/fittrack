import { Skeleton } from "@/components/ui/skeleton";

export default function NewSessionLoading() {
  return (
    <div>
      <Skeleton className="h-8 w-32 mb-6" />

      <div className="space-y-5">
        {/* Date */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>

        {/* Activity Type */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>

        {/* Goal (optional) */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>

        {/* Focus */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>

        {/* Duration + RPE */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>

        {/* Submit button */}
        <Skeleton className="h-8 w-full rounded-lg" />
      </div>
    </div>
  );
}
