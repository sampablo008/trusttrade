import type { MediaBucket } from "@/types/media";

const encodePathSegments = (path: string) => path.split("/").map(encodeURIComponent).join("/");

export const buildMediaUrl = (bucket: MediaBucket, path: string) =>
  `/api/media/${encodeURIComponent(bucket)}/${encodePathSegments(path)}`;
