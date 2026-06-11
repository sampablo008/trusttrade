import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold mirroring the referrals layout. */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16"
    >
      <span className="sr-only">Loading referrals…</span>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-full max-w-2xl" />
      </div>

      {/* Referrals panel */}
      <Skeleton className="h-112 w-full rounded-2xl" />
    </main>
  );
}
