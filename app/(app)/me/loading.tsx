import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold mirroring the profile layout. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16"
    >
      <span className="sr-only">Loading profile…</span>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Settings cards */}
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </main>
  );
}
