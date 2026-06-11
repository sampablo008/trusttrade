import { Suspense } from "react";
import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset password | TrustTrade",
  description: "Enter the 6-digit code we emailed to set a new password.",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ email?: string }>;
}

export default function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Set a new password"
      description="Enter the 6-digit code we emailed you, then choose a new password."
      backHref="/forgot-password"
      backLabel="Use a different email"
    >
      <Suspense fallback={<ResetPasswordForm prefillEmail="" />}>
        <ResetForm searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function ResetForm({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  return <ResetPasswordForm prefillEmail={(params.email ?? "").trim()} />;
}
