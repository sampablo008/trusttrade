import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TrustTrade Privacy Policy — how we collect and use your data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted transition hover:text-foreground"
      >
        ← Back to TrustTrade
      </Link>

      <h1 className="font-display text-4xl font-bold tracking-tight text-foreground">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-muted">Last updated: April 2026</p>

      <div className="mt-12 space-y-10">
        <Section title="1. Data We Collect">
          <p>We collect the following categories of personal data:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Account data: email address, username, hashed password</li>
            <li>Profile data: display name, avatar image</li>
            <li>Transaction data: trade history, deposit and withdrawal records</li>
            <li>Financial data: wallet addresses you provide for withdrawals</li>
            <li>Usage data: IP addresses, browser user-agent, access timestamps</li>
            <li>Deposit proofs: screenshots you upload to verify deposits</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul className="list-inside list-disc space-y-1">
            <li>To operate your account and process trades</li>
            <li>To review and approve deposits and withdrawals</li>
            <li>To detect and prevent fraud</li>
            <li>To calculate and pay referral commissions</li>
            <li>To send transactional emails (deposit approvals, withdrawal updates)</li>
            <li>To comply with applicable legal obligations</li>
          </ul>
        </Section>

        <Section title="3. Data Sharing">
          <p>
            We do not sell your personal data. We may share data with:
          </p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>
              <strong className="text-foreground">Supabase</strong> — our database and
              authentication provider (EU data processing available)
            </li>
            <li>
              <strong className="text-foreground">Sentry</strong> — error monitoring (no PII in
              error payloads)
            </li>
            <li>
              <strong className="text-foreground">Vercel</strong> — hosting and edge delivery
            </li>
            <li>Law enforcement when required by valid legal process</li>
          </ul>
        </Section>

        <Section title="4. Data Retention">
          <p>
            Account data is retained for the lifetime of your account plus 7 years for financial
            compliance purposes. You may request deletion of non-financial data by contacting
            support.
          </p>
        </Section>

        <Section title="5. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request erasure of non-financial data</li>
            <li>Object to processing for marketing purposes</li>
            <li>Data portability</li>
          </ul>
          <p className="mt-3">
            To exercise these rights, email{" "}
            <a href="mailto:privacy@trusttrade.pro" className="text-brand hover:underline">
              privacy@trusttrade.pro
            </a>
            .
          </p>
        </Section>

        <Section title="6. Cookies">
          <p>
            We use essential session cookies only. No third-party tracking cookies. Session cookies
            are httpOnly, Secure, and SameSite=Lax. You can delete cookies via your browser
            settings, which will log you out.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            We use TLS 1.3, encrypted storage, and role-based access controls to protect your data.
            Deposit screenshots are stored in private buckets accessible only to admins and the
            uploading user.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this policy. Significant changes will be communicated by email. Continued
            use after changes constitutes acceptance.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            For privacy enquiries:{" "}
            <a href="mailto:privacy@trusttrade.pro" className="text-brand hover:underline">
              privacy@trusttrade.pro
            </a>
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
