import { ApiClientError } from "@/lib/api/client";
import { listPublicWallets } from "@/lib/wallets/service";

export async function GET() {
  try {
    const result = await listPublicWallets();

    return Response.json({ data: result });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "WALLETS_BAD_REQUEST", message: "Wallet list failed." } },
      { status: 400 },
    );
  }
}
