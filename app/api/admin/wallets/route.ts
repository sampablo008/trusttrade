import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { createAdminWallet, listAdminWallets } from "@/lib/wallets/admin-service";

export async function GET() {
  try {
    await assertAdminApi();

    const result = await listAdminWallets();

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "ADMIN_WALLETS_BAD_REQUEST", message: "Wallet list failed." } },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await assertAdminApi();

    const payload = await request.json();
    const result = await createAdminWallet(payload);

    return Response.json({ data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "ADMIN_WALLET_CREATE_BAD_REQUEST", message: "Wallet create failed." } },
      { status: 400 },
    );
  }
}
