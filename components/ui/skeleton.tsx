import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn(
        "rounded-lg",
        "bg-muted/60",
        "bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]",
        "animate-[shimmer_2s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
