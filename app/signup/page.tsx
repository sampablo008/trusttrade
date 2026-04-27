import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";
import SignupForm from "@/components/auth/signup-form";

interface SignupPageProps {
  searchParams: Promise<{
    ref?: string;
  }>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:gap-8 sm:px-6 sm:py-8 lg:px-8">
      <header className="flex items-center justify-between">
        <Link href="/" aria-label="TrustPro home">
          <BrandLogo size={36} wordmarkClassName="text-lg tracking-[-0.01em]" />
        </Link>
        <Link
          href="/login"
          className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand/60 hover:text-foreground"
        >
          Sign in
        </Link>
      </header>

      <section className="rounded-[28px] border border-border bg-surface-soft p-6 sm:rounded-[36px] sm:p-8">
        <div className="max-w-3xl space-y-3 sm:space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
            Create your trader account
          </p>
          <h1 className="font-display text-3xl leading-[1.1] tracking-tight text-foreground sm:text-5xl sm:leading-tight lg:text-6xl">
            Claim your desk before the next move starts.
          </h1>
          <p className="text-sm leading-7 text-muted sm:text-base sm:leading-8">
            TrustPro is invite-only. Paste the invite code your referrer shared with you, then set
            up a username, email, and password. You&apos;ll be on the trading desk within a
            minute.
          </p>
        </div>

        <div className="mt-6 sm:mt-10">
          <SignupForm initialCode={params.ref ?? ""} />
        </div>
      </section>
    </main>
  );
}
