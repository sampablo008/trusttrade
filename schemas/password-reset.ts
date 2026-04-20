import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const forgotPasswordInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
});

export const resetPasswordInputSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email."),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code."),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const verifyEmailInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code."),
});

export const resendCodeInputSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  purpose: z.enum(["email_verification", "password_reset", "login_code"]),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;
export type ResendCodeInput = z.infer<typeof resendCodeInputSchema>;
