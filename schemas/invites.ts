import { z } from "zod";

export const inviteCodeSchema = z
  .string()
  .trim()
  .min(4, "Invite code is too short.")
  .max(64, "Invite code is too long.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Invite code format is invalid.")
  .transform((value) => value.toUpperCase());

export const inviteSourceSchema = z.enum(["admin", "user"]);
export const inviteStatusSchema = z.enum(["active", "used", "revoked", "expired"]);
export const inviteModeSchema = z.enum(["live", "preview"]);

export const inviteValidationQuerySchema = z.object({
  code: inviteCodeSchema,
});

export const inviteValidationResultSchema = z.object({
  code: z.string(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  isSingleUse: z.boolean(),
  isValid: z.boolean(),
  message: z.string(),
  mode: inviteModeSchema,
  ownerUserId: z.string().uuid().nullable(),
  source: inviteSourceSchema.nullable(),
  status: z.string().nullable(),
});

export const invitedSignupSchema = z.object({
  code: inviteCodeSchema,
  email: z.string().trim().email("Enter a valid email."),
  password: z
    .string()
    .trim()
    .min(8, "Use at least 8 characters.")
    .max(128, "Password is too long.")
    .regex(/[A-Z]/, "Include at least one uppercase letter.")
    .regex(/[0-9]/, "Include at least one number."),
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

export const adminInviteCodeSchema = z.object({
  code: inviteCodeSchema,
  createdAt: z.string().datetime({ offset: true }),
  createdByAdminId: z.string().uuid().nullable(),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  isSingleUse: z.boolean(),
  lastUsedAt: z.string().datetime({ offset: true }).nullable(),
  mode: inviteModeSchema,
  note: z.string().max(240).nullable(),
  ownerUserId: z.string().uuid().nullable(),
  revokedAt: z.string().datetime({ offset: true }).nullable(),
  source: inviteSourceSchema,
  status: inviteStatusSchema,
  usedCount: z.number().int().nonnegative(),
});

export const adminInviteSummarySchema = z.object({
  activeCount: z.number().int().nonnegative(),
  adminCount: z.number().int().nonnegative(),
  expiredCount: z.number().int().nonnegative(),
  revokedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  usedCount: z.number().int().nonnegative(),
  userCount: z.number().int().nonnegative(),
});

export const adminInviteCodesResultSchema = z.object({
  items: z.array(adminInviteCodeSchema),
  summary: adminInviteSummarySchema,
});

export const mintInviteCodesInputSchema = z.object({
  count: z.coerce.number().int().min(1, "Mint at least one code.").max(1000, "Max batch is 1000."),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  note: z
    .string()
    .trim()
    .max(240, "Keep the batch note under 240 characters.")
    .nullable(),
});

export const mintedInviteCodeSchema = z.object({
  code: inviteCodeSchema,
  createdAt: z.string().datetime({ offset: true }),
  expiresAt: z.string().datetime({ offset: true }).nullable(),
  mode: inviteModeSchema,
  note: z.string().nullable(),
});

export const mintInviteCodesResultSchema = z.object({
  batch: z.array(mintedInviteCodeSchema),
  mode: inviteModeSchema,
});

export const revokeInviteCodeResultSchema = z.object({
  code: inviteCodeSchema,
  mode: inviteModeSchema,
  revokedAt: z.string().datetime({ offset: true }),
  status: inviteStatusSchema,
});
