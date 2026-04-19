import "server-only";
import { randomUUID } from "node:crypto";
import { ApiClientError } from "@/lib/api/client";
import { getAppSession } from "@/lib/auth/session";
import { getOptionalServerEnv } from "@/lib/env/server";
import { buildMediaUrl } from "@/lib/media/path";
import { getPreviewMediaObject, storePreviewMediaObject } from "@/lib/media/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  mediaBucketSchema,
  mediaObjectPathSchema,
  tokenIconMimeTypeSchema,
  tokenIconUploadFormSchema,
  tokenIconUploadResultSchema,
} from "@/schemas/media";
import type { MediaBucket, MediaBucketPolicy, MediaObject, TokenIconUploadResult } from "@/types/media";

const mediaBucketPolicies: Record<MediaBucket, MediaBucketPolicy> = {
  avatars: {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
    isPublic: true,
    maxBytes: 2 * 1024 * 1024,
  },
  "deposit-proofs": {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"],
    isPublic: false,
    maxBytes: 5 * 1024 * 1024,
  },
  "promo-assets": {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    isPublic: true,
    maxBytes: 5 * 1024 * 1024,
  },
  "token-icons": {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    isPublic: true,
    maxBytes: 512 * 1024,
  },
  "withdrawal-receipts": {
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
    isPublic: false,
    maxBytes: 5 * 1024 * 1024,
  },
};

const mimeToExtension: Record<"image/png" | "image/jpeg" | "image/webp", string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const getFirstFolder = (path: string) => path.split("/")[0] ?? "";

const sanitizeSymbolFolder = (symbol: string) => {
  const parsed = tokenIconUploadFormSchema.parse({ symbol });
  return parsed.symbol.toLowerCase();
};

const resolveContentType = (blob: Blob, fallbackMimeType: string) => blob.type || fallbackMimeType;

const createMediaObjectFromBlob = async (
  blob: Blob,
  cacheControl: string,
  fallbackMimeType = "application/octet-stream",
): Promise<MediaObject> => ({
  body: await blob.arrayBuffer(),
  cacheControl,
  contentType: resolveContentType(blob, fallbackMimeType),
  sizeBytes: blob.size,
});

const getBucketPolicy = (bucket: string) => mediaBucketPolicies[mediaBucketSchema.parse(bucket)];

const normalizeObjectPath = (path: string | string[]) =>
  mediaObjectPathSchema.parse(Array.isArray(path) ? path.join("/") : path);

const getPrivateMediaObject = async (bucket: MediaBucket, path: string): Promise<MediaObject> => {
  const session = await getAppSession();

  if (!session.isAuthenticated) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHORIZED");
  }

  if (session.isAdmin) {
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient.storage.from(bucket).download(path);

    if (error || !data) {
      throw new ApiClientError("Media asset not found.", 404, "MEDIA_NOT_FOUND", error);
    }

    return createMediaObjectFromBlob(data, "private, max-age=60");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ApiClientError("Authentication required.", 401, "UNAUTHORIZED", authError);
  }

  if (getFirstFolder(path) !== user.id) {
    throw new ApiClientError("Forbidden.", 403, "FORBIDDEN");
  }

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new ApiClientError("Media asset not found.", 404, "MEDIA_NOT_FOUND", error);
  }

  return createMediaObjectFromBlob(data, "private, max-age=60");
};

export const getMediaObject = async (bucketValue: string, pathValue: string | string[]) => {
  const bucket = mediaBucketSchema.parse(bucketValue);
  const path = normalizeObjectPath(pathValue);
  const policy = getBucketPolicy(bucket);

  if (!getOptionalServerEnv()) {
    const previewAsset = getPreviewMediaObject(bucket, path);

    if (previewAsset) {
      return previewAsset;
    }

    if (!policy.isPublic) {
      const session = await getAppSession();

      if (!session.isAdmin) {
        throw new ApiClientError("Preview private media is admin-only.", 403, "FORBIDDEN");
      }
    }

    throw new ApiClientError("Media asset not found.", 404, "MEDIA_NOT_FOUND");
  }

  if (!policy.isPublic) {
    return getPrivateMediaObject(bucket, path);
  }

  const adminClient = createSupabaseAdminClient();
  const { data, error } = await adminClient.storage.from(bucket).download(path);

  if (error || !data) {
    throw new ApiClientError("Media asset not found.", 404, "MEDIA_NOT_FOUND", error);
  }

  return createMediaObjectFromBlob(data, "public, max-age=3600, stale-while-revalidate=86400");
};

export const uploadTokenIcon = async (formData: FormData): Promise<TokenIconUploadResult> => {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new ApiClientError("A token icon file is required.", 400, "TOKEN_ICON_REQUIRED");
  }

  const { symbol } = tokenIconUploadFormSchema.parse({
    symbol: formData.get("symbol"),
  });
  const contentType = tokenIconMimeTypeSchema.parse(file.type);
  const bucket = "token-icons" satisfies MediaBucket;
  const policy = getBucketPolicy(bucket);

  if (!file.size || file.size > policy.maxBytes) {
    throw new ApiClientError(
      `Token icon must be 512 KB or smaller.`,
      400,
      "TOKEN_ICON_TOO_LARGE",
      { maxBytes: policy.maxBytes, sizeBytes: file.size },
    );
  }

  if (!policy.allowedMimeTypes.includes(contentType)) {
    throw new ApiClientError(
      "Token icon format is invalid. Use PNG, JPG, or WebP.",
      400,
      "TOKEN_ICON_INVALID_TYPE",
      { allowedMimeTypes: policy.allowedMimeTypes, contentType },
    );
  }

  const path = `${sanitizeSymbolFolder(symbol)}/${randomUUID()}.${mimeToExtension[contentType]}`;
  const mediaUrl = buildMediaUrl(bucket, path);

  if (!getOptionalServerEnv()) {
    storePreviewMediaObject(bucket, path, {
      body: await file.arrayBuffer(),
      cacheControl: "public, max-age=3600",
      contentType,
      sizeBytes: file.size,
    });

    return tokenIconUploadResultSchema.parse({
      bucket,
      contentType,
      mediaUrl,
      path,
      sizeBytes: file.size,
    });
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    contentType,
    upsert: true,
  });

  if (error) {
    throw new ApiClientError("Token icon upload failed.", 500, "TOKEN_ICON_UPLOAD_FAILED", error);
  }

  return tokenIconUploadResultSchema.parse({
    bucket,
    contentType,
    mediaUrl,
    path,
    sizeBytes: file.size,
  });
};
