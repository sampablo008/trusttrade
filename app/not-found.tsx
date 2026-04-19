import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-full border border-border bg-background/30">
        <SearchX size={36} className="text-muted" />
      </div>
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
      <Link
        href="/trade"
        className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-background transition hover:opacity-90"
      >
        Go to trading
      </Link>
    </main>
  );
}
