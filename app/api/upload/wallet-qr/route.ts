import { NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { buildMediaUrl } from "@/lib/media/path";
import { getOptionalServerEnv } from "@/lib/env/server";
import { storePreviewMediaObject } from "@/lib/media/preview-data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 512 * 1024;
const BUCKET = "token-icons";

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const formData = await request.formData();
    const file = formData.get("file");
    const symbol = formData.get("symbol");

    if (!(file instanceof File)) {
      throw new ApiClientError("A QR code image file is required.", 400, "FILE_REQUIRED");
    }
    if (typeof symbol !== "string" || !symbol) {
      throw new ApiClientError("Token symbol is required.", 400, "SYMBOL_REQUIRED");
    }
    if (file.size > MAX_BYTES) {
      throw new ApiClientError("File must be 512 KB or smaller.", 413, "TOO_LARGE");
    }
    if (!ALLOWED_MIME.includes(file.type)) {
      throw new ApiClientError(
        "Unsupported file type. Use PNG, JPEG, or WebP.",
        400,
        "BAD_MIME",
      );
    }

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `qr/${symbol.toUpperCase()}.${ext}`;
    const mediaUrl = buildMediaUrl(BUCKET, path);

    if (!getOptionalServerEnv()) {
      storePreviewMediaObject(BUCKET, path, {
        body: await file.arrayBuffer(),
        cacheControl: "public, max-age=3600",
        contentType: file.type,
        sizeBytes: file.size,
      });
      return NextResponse.json({ path, mediaUrl }, { status: 201 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) {
      throw new ApiClientError("Upload failed.", 500, "UPLOAD_FAILED", error);
    }

    return NextResponse.json({ path, mediaUrl }, { status: 201 });
  } catch (err) {
    if (err instanceof ApiClientError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Unexpected error." } },
      { status: 500 },
    );
  }
}
