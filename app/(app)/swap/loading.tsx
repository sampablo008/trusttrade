import { Skeleton } from "@/components/ui/Skeleton";

/** Loading scaffold mirroring the swap layout (centered form). */
export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-16"
    >
      <span className="sr-only">Loading swap…</span>

      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3" />
      </div>

      {/* Swap form card */}
      <Skeleton className="h-96 w-full rounded-2xl" />
    </main>
  );
}
