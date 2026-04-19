import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { assertAdmin } from "@/lib/auth/assertAdmin";
import { listAdminDeposits } from "@/lib/deposits/admin-service";
import DepositsQueue from "@/components/admin/deposits-queue";

export default async function AdminDepositsPage() {
  await assertAdmin();

  const result = await listAdminDeposits({ status: "pending", limit: 100, offset: 0 });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="flex items-center gap-2 rounded-full border border-border bg-background/30 px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand hover:text-foreground"
        >
          <ArrowLeft size={14} />
          Admin
        </Link>
        <div className="flex flex-col gap-0.5">
          <h1 className="font-display text-3xl text-foreground">Deposit Queue</h1>
          <p className="text-xs text-muted">Review, approve, or reject user deposit claims.</p>
        </div>
      </div>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:p-8">
        <DepositsQueue initialDeposits={result.items} />
      </section>
    </main>
  );
}
