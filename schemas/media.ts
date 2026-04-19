import { z } from "zod";

export const mediaBucketSchema = z.enum([
  "token-icons",
  "avatars",
  "promo-assets",
  "deposit-proofs",
  "withdrawal-receipts",
]);

export const mediaObjectPathSchema = z
  .string()
  .trim()
  .min(1, "Media path is required.")
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.endsWith("/") &&
      value.split("/").every((segment) => segment.length > 0 && segment !== "." && segment !== ".."),
    {
      message: "Media path is invalid.",
    },
  );

export const tokenIconMimeTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);

export const tokenIconUploadFormSchema = z.object({
  symbol: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,12}$/, "Symbol format is invalid.")
    .catch("TOKEN"),
});

export const tokenIconUploadResultSchema = z.object({
  bucket: z.literal("token-icons"),
  contentType: tokenIconMimeTypeSchema,
  mediaUrl: z.string().min(1),
  path: mediaObjectPathSchema,
  sizeBytes: z.number().int().positive().max(524288),
});
