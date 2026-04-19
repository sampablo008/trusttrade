import "server-only";
import type { MediaBucket, MediaObject } from "@/types/media";

interface PreviewMediaRecord extends MediaObject {
  uploadedAt: string;
}

const previewMediaStore = new Map<string, PreviewMediaRecord>();

const getPreviewMediaKey = (bucket: MediaBucket, path: string) => `${bucket}:${path}`;

export const storePreviewMediaObject = (
  bucket: MediaBucket,
  path: string,
  mediaObject: MediaObject,
) => {
  previewMediaStore.set(getPreviewMediaKey(bucket, path), {
    ...mediaObject,
    uploadedAt: new Date().toISOString(),
  });
};

export const getPreviewMediaObject = (bucket: MediaBucket, path: string) =>
  previewMediaStore.get(getPreviewMediaKey(bucket, path)) ?? null;
