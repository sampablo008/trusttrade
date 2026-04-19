import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { deleteAdminToken, updateAdminToken } from "@/lib/markets/admin-service";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();

    const payload = await request.json();
    const { id } = await params;
    const result = await updateAdminToken(id, payload);

    return Response.json({ data: result });
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
          code: "ADMIN_TOKEN_UPDATE_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Token update failed.",
        },
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await assertAdminApi();

    const { id } = await params;
    const result = await deleteAdminToken(id);

    return Response.json({ data: result });
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
          code: "ADMIN_TOKEN_DELETE_BAD_REQUEST",
          message: error instanceof Error ? error.message : "Token delete failed.",
        },
      },
      { status: 400 },
    );
  }
}
