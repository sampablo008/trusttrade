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
            Sprint 0.5 invitation gate
          </p>
          <h1 className="font-display text-5xl tracking-tight text-foreground sm:text-6xl">
            No code. No signup.
          </h1>
          <p className="text-base leading-8 text-muted">
            The form stays hidden until the invite is valid. Query-string refs such as
            `?ref=REF_ATLAS` prefill the code and trigger live validation.
          </p>
        </div>

        <div className="mt-10">
          <SignupForm initialCode={params.ref ?? ""} />
        </div>
      </section>
    </main>
  );
}
