import { NextResponse } from "next/server";
import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { updateAdminTokenIconPath } from "@/lib/markets/admin-service";
import { uploadTokenIcon } from "@/lib/media/service";

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const formData = await request.formData();
    const symbol = formData.get("symbol");

    if (typeof symbol !== "string" || !symbol) {
      throw new ApiClientError("Token symbol is required.", 400, "SYMBOL_REQUIRED");
    }

    const result = await uploadTokenIcon(formData);

    await updateAdminTokenIconPath(symbol, result.path);

    return NextResponse.json({ path: result.path, mediaUrl: result.mediaUrl }, { status: 201 });
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
