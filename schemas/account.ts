import { z } from "zod";

const strongPassword = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[0-9]/, "Include at least one number.");

const pinString = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "PIN must be exactly 6 digits.");

export const changePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: strongPassword,
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must differ from the current one.",
    path: ["newPassword"],
  });

export const setWithdrawalPinInputSchema = z
  .object({
    currentPin: pinString.optional(),
    newPin: pinString,
    confirmPin: pinString,
  })
  .refine((value) => value.newPin === value.confirmPin, {
    message: "PINs do not match.",
    path: ["confirmPin"],
  });

export const verifyWithdrawalPinInputSchema = z.object({
  pin: pinString,
});

export const accountSecurityStatusSchema = z.object({
  hasWithdrawalPin: z.boolean(),
  emailVerified: z.boolean(),
});

export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;
export type SetWithdrawalPinInput = z.infer<typeof setWithdrawalPinInputSchema>;
export type VerifyWithdrawalPinInput = z.infer<typeof verifyWithdrawalPinInputSchema>;
export type AccountSecurityStatus = z.infer<typeof accountSecurityStatusSchema>;
