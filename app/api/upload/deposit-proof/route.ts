import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import { buildMediaUrl } from "@/lib/media/path";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = "deposit-proofs";

export async function POST(request: Request) {
  try {
    const { userId } = await assertUserApi();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      throw new ApiClientError("A proof screenshot file is required.", 400, "FILE_REQUIRED");
    }

    if (file.size > MAX_BYTES) {
      throw new ApiClientError("File must be 5 MB or smaller.", 413, "TOO_LARGE");
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      throw new ApiClientError(
        "Unsupported file type. Use PNG, JPEG, or WebP.",
        400,
        "BAD_MIME",
      );
    }

    const ext = file.type === "image/png" ? "png"
      : file.type === "image/webp" ? "webp"
      : "jpg";
    const path = `${userId}/${randomUUID()}.${ext}`;
    const mediaUrl = buildMediaUrl(BUCKET, path);

    if (!getOptionalServerEnv()) {
      // Preview mode — return a fake path
      return NextResponse.json({ path, mediaUrl }, { status: 201 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

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
