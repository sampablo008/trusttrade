import { Skeleton } from "./Skeleton";

/** Generic page-level loading scaffold used by segment `loading.tsx` files. */
export function RouteSkeleton({ className }: { className?: string }) {
  return (
    <div className={className ?? "mx-auto max-w-5xl space-y-6 px-4 py-10"} aria-busy="true">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
