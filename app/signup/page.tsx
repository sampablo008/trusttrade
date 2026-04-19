import SignupForm from "@/components/auth/signup-form";

interface SignupPageProps {
  searchParams: Promise<{
    ref?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-[36px] border border-border bg-surface-soft p-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
            Trader access invite
          </p>
          <h1 className="font-display text-5xl tracking-tight text-foreground sm:text-6xl">
            Claim your desk before the next move starts.
          </h1>
          <p className="text-base leading-8 text-muted">
            Use your invite to unlock a trading account, join the desk, and get into the market
            fast. Query-string refs such as `?ref=REF_ATLAS` still prefill the code and trigger
            live validation.
          </p>
        </div>

        <div className="mt-10">
          <SignupForm initialCode={params.ref ?? ""} />
        </div>
      </section>
    </main>
  );
}
