import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { uploadTokenIcon } from "@/lib/media/service";

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const formData = await request.formData();
    const result = await uploadTokenIcon(formData);

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        {
          error: {
            code: error.code,
            details: error.details,
            message: error.message,
          },
        },
        { status: error.status },
      );
    }

    return Response.json(
      {
        error: {
          code: "TOKEN_ICON_UPLOAD_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Token icon upload failed.",
        },
      },
      { status: 400 },
    );
  }
}
