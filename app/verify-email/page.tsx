import { Suspense } from "react";
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

export default function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  return (
    <AuthCard
      eyebrow="Email verification"
      title="Confirm your email"
      description="We sent a 6-digit code to your inbox. Enter it below to activate your account."
      backHref="/login"
      backLabel="Back to sign in"
    >
      <Suspense fallback={<VerifyEmailForm prefillEmail="" />}>
        <VerifyForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function VerifyForm({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  return <VerifyEmailForm prefillEmail={(params.email ?? "").trim()} />;
}
