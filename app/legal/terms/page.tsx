import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "TrustTrade Terms of Service — read before trading.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
      >
        ← Back to TrustTrade
      </Link>

      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Terms of Service
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: April 2026</p>

      <div className="prose-legal mt-12 space-y-10">
        <Section title="1. Acceptance">
          <p>
            By accessing or using TrustTrade (&quot;the Platform&quot;), you agree to be bound by these
            Terms of Service. If you do not agree, do not use the Platform. The Platform is
            invitation-only and available solely to users who have received a valid invitation code.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old and not a resident of any jurisdiction where binary
            options trading is prohibited. You are solely responsible for determining whether your
            use of the Platform is legal in your jurisdiction. We reserve the right to terminate
            accounts that violate this requirement.
          </p>
        </Section>

        <Section title="3. Nature of Trading">
          <p>
            TrustTrade is a binary prediction platform. You predict whether an asset price will be
            higher or lower at expiry. All trade outcomes are final once settled. Past performance
            does not guarantee future results. You may lose your entire invested amount on any
            single trade.
          </p>
          <p className="mt-3">
            <strong className="text-warning">Risk warning:</strong> Binary trading carries a high
            level of risk. Never trade with funds you cannot afford to lose.
          </p>
        </Section>

        <Section title="4. Account Security">
          <p>
            You are responsible for maintaining the confidentiality of your credentials. You must
            notify us immediately of any unauthorised access. We are not liable for losses arising
            from your failure to secure your account.
          </p>
        </Section>

        <Section title="5. Deposits &amp; Withdrawals">
          <p>
            All deposits require admin review before crediting. Withdrawals are subject to a minimum
            of $50 and may require completion of bonus wagering requirements. We reserve the right
            to reject deposits or withdrawals if we have reasonable grounds to suspect fraud.
          </p>
        </Section>

        <Section title="6. Referral Programme">
          <p>
            Referral commissions are credited as locked bonus funds subject to a 3× wagering
            requirement before withdrawal. We reserve the right to clawback commissions associated
            with fraudulent activity or reversed deposits.
          </p>
        </Section>

        <Section title="7. Prohibited Activities">
          <ul className="list-inside list-disc space-y-1">
            <li>Creating multiple accounts to exploit the referral programme</li>
            <li>Submitting fraudulent or manipulated deposit screenshots</li>
            <li>Automated or scripted trading</li>
            <li>Sharing account access with third parties</li>
            <li>Any activity intended to defraud the Platform or other users</li>
          </ul>
        </Section>

        <Section title="8. Termination">
          <p>
            We may suspend or terminate your account at any time for breach of these Terms or for
            any reason at our sole discretion. Pending legitimate withdrawals will be processed
            after investigation.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, TrustTrade is not liable for any indirect,
            incidental, special, or consequential damages, including loss of profits arising from
            your use of the Platform.
          </p>
        </Section>

        <Section title="10. Changes to Terms">
          <p>
            We may update these Terms at any time. Continued use of the Platform after changes
            constitutes acceptance. Material changes will be notified by email.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For any queries regarding these Terms, contact{" "}
            <a href="mailto:support@trusttrade.pro" className="text-brand hover:underline">
              support@trusttrade.pro
            </a>
            .
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
