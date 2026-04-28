import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import VerifyEmailForm from "@/components/auth/verify-email-form";

export const metadata: Metadata = {
  title: "Verify email | TrustTrade",
  description: "Confirm your email to finish setting up your TrustTrade account.",
};

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const prefillEmail = (params.email ?? "").trim();

  return (
    <AuthCard
      eyebrow="Email verification"
      title="Confirm your email"
      description="We sent a 6-digit code to your inbox. Enter it below to activate your account."
      backHref="/login"
      backLabel="Back to sign in"
    >
      <VerifyEmailForm prefillEmail={prefillEmail} />
    </AuthCard>
  );
}
