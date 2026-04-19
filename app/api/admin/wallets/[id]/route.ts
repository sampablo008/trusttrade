import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { deleteAdminWallet, updateAdminWallet } from "@/lib/wallets/admin-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { id } = await context.params;
    const payload = await request.json();
    const result = await updateAdminWallet(id, payload);

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "ADMIN_WALLET_UPDATE_BAD_REQUEST", message: "Wallet update failed." } },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { id } = await context.params;
    const result = await deleteAdminWallet(id);

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "ADMIN_WALLET_DELETE_BAD_REQUEST", message: "Wallet delete failed." } },
      { status: 400 },
    );
  }
}
