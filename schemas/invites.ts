import { z } from "zod";

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4, "Invite code is too short.")
  .max(64, "Invite code is too long.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Invite code format is invalid.")
  .transform((value) => value.toUpperCase());

export const inviteValidationQuerySchema = z.object({
  code: inviteCodeSchema,
});

export const inviteValidationResultSchema = z.object({
  code: z.string(),
  expiresAt: z.string().datetime().nullable(),
  isSingleUse: z.boolean(),
  isValid: z.boolean(),
  message: z.string(),
  mode: z.enum(["live", "preview"]),
  ownerUserId: z.string().uuid().nullable(),
  source: z.enum(["admin", "user"]).nullable(),
  status: z.string().nullable(),
});

export const invitedSignupSchema = z.object({
  code: inviteCodeSchema,
  email: z.string().trim().email("Enter a valid email."),
  password: z
    .string()
    .trim()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password is too long."),
  username: z
    .string()
    .trim()
    .min(3, "Use at least 3 characters.")
    .max(32, "Username is too long.")
    .regex(/^[a-z0-9_][a-z0-9._-]{2,31}$/, "Username format is invalid."),
});

export const inviteSignupResultSchema = z.object({
  nextPath: z.string(),
  userId: z.string().uuid(),
});
