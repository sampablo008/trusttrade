const MAX_WIDTH_PX = 1600;
const WEBP_QUALITY = 0.85;

/**
 * Compress a user-picked image to WebP via OffscreenCanvas.
 * Strips EXIF automatically because canvas export re-encodes pixels only.
 * Falls back to the original file when OffscreenCanvas is unavailable.
 */
export async function compressImage(
  file: File,
  maxWidthPx = MAX_WIDTH_PX,
  quality = WEBP_QUALITY,
): Promise<File> {
  if (typeof OffscreenCanvas === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidthPx / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
