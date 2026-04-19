import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Risk Disclaimer",
  description: "TrustPro Risk Disclaimer — understand the risks before you trade.",
};

export default function DisclaimerPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
      >
        ← Back to TrustPro
      </Link>

      <div className="mb-10 rounded-2xl border border-down/30 bg-down/10 px-6 py-5">
        <p className="text-sm font-semibold text-down">
          HIGH RISK WARNING
        </p>
        <p className="mt-1 text-sm text-muted">
          Binary options trading involves substantial risk. You may lose all funds you deposit.
          Only trade with money you can afford to lose entirely.
        </p>
      </div>

      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Risk Disclaimer
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: April 2026</p>

      <div className="mt-12 space-y-10">
        <Section title="1. High-Risk Nature of Binary Trading">
          <p>
            Binary options trading is speculative and carries a high degree of risk. You can lose
            your entire invested capital on a single trade. The fact that potential payouts are
            fixed does not reduce the inherent risk of loss.
          </p>
        </Section>

        <Section title="2. No Investment Advice">
          <p>
            Nothing on the TrustPro platform constitutes investment, financial, or trading advice.
            All information provided is for entertainment and educational purposes only. You make
            all trading decisions independently and at your own risk.
          </p>
        </Section>

        <Section title="3. Chart Display">
          <p>
            Price charts displayed on the platform may not exactly reflect prices on external
            cryptocurrency exchanges. Charts are provided for informational purposes and trade
            outcome reference only. Do not rely on TrustPro charts for external trading decisions.
          </p>
        </Section>

        <Section title="4. Past Performance">
          <p>
            Historical trade outcomes, win rates, or payout statistics shown on the platform do not
            guarantee future results. Each trade outcome is independent.
          </p>
        </Section>

        <Section title="5. Jurisdiction">
          <p>
            Binary options trading is restricted or prohibited in many jurisdictions. You are solely
            responsible for ensuring your use of TrustPro is lawful in your country or territory.
            We do not accept users from jurisdictions where such trading is prohibited.
          </p>
        </Section>

        <Section title="6. No Guarantee of Withdrawals">
          <p>
            Withdrawals are subject to admin review, minimum thresholds, wagering requirements, and
            fraud checks. We reserve the right to withhold funds pending investigation. Approved
            withdrawals are processed within a reasonable timeframe at our discretion.
          </p>
        </Section>

        <Section title="7. Technical Risk">
          <p>
            Platform outages, connectivity issues, or system errors may affect your ability to
            place or close trades. We are not liable for losses arising from technical failures
            beyond our reasonable control.
          </p>
        </Section>

        <Section title="8. Responsible Trading">
          <p>
            If you believe you have a gambling problem, please seek help from a recognised
            organisation in your country. TrustPro encourages responsible trading and reserves
            the right to limit activity for users showing signs of harmful behaviour.
          </p>
        </Section>
      </div>

      <LegalFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-2 text-sm leading-7 text-muted">{children}</div>
    </section>
  );
}

function LegalFooter() {
  return (
    <footer className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-8 text-xs text-muted">
      <Link href="/legal/terms" className="hover:text-foreground">Terms</Link>
      <Link href="/legal/privacy" className="hover:text-foreground">Privacy</Link>
      <Link href="/legal/disclaimer" className="hover:text-foreground">Disclaimer</Link>
    </footer>
  );
}
