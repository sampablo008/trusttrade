export type MediaBucket =
  | "token-icons"
  | "avatars"
  | "promo-assets"
  | "deposit-proofs"
  | "withdrawal-receipts";

export interface MediaBucketPolicy {
  allowedMimeTypes: string[];
  isPublic: boolean;
  maxBytes: number;
}

export interface MediaObject {
  body: ArrayBuffer;
  cacheControl: string;
  contentType: string;
  sizeBytes: number;
}

export interface TokenIconUploadResult {
  bucket: "token-icons";
  contentType: "image/png" | "image/jpeg" | "image/webp";
  mediaUrl: string;
  path: string;
  sizeBytes: number;
}
