import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold mirroring the portfolio (trade history) layout. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16"
    >
      <span className="sr-only">Loading portfolio…</span>

      {/* Title + export */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-40" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-16 rounded-full" />
        <Skeleton className="h-9 w-16 rounded-full" />
      </div>

      {/* Table */}
      <Skeleton className="h-96 w-full rounded-2xl" />
    </main>
  );
}
