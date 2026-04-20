import type { Metadata } from "next";
import AuthCard from "@/components/auth/auth-card";
import ForgotPasswordForm from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot password | TrustPro",
  description: "Request a verification code to reset your TrustPro password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      eyebrow="Account recovery"
      title="Forgot your password?"
      description="Enter the email on your account and we'll send a 6-digit verification code."
      backHref="/login"
      backLabel="Back to sign in"
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
