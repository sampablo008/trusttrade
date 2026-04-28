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

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const prefillEmail = (params.email ?? "").trim();

  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Set a new password"
      description="Enter the 6-digit code we emailed you, then choose a new password."
      backHref="/forgot-password"
      backLabel="Use a different email"
    >
      <ResetPasswordForm prefillEmail={prefillEmail} />
    </AuthCard>
  );
}
