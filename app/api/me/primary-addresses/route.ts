import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  listPrimaryAddresses,
  removePrimaryAddress,
  setPrimaryAddress,
} from "@/lib/account/primary-address-service";
import { ApiClientError } from "@/lib/api/client";
import { assertUserApi } from "@/lib/auth/assert-user-api";
import {
  removePrimaryAddressInputSchema,
  setPrimaryAddressInputSchema,
} from "@/schemas/primary-address";

const handleError = (err: unknown) => {
  if (err instanceof ApiClientError) {
    return NextResponse.json(
      { error: { code: err.code, message: err.message } },
      { status: err.status },
    );
  }
  if (err instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: err.issues[0]?.message ?? "Invalid input.",
        },
      },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Unexpected error." } },
    { status: 500 },
  );
};

export async function GET() {
  try {
    const { userId } = await assertUserApi();
    const result = await listPrimaryAddresses(userId);
    return NextResponse.json({ data: result });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await assertUserApi();
    const body = await request.json();
    const input = setPrimaryAddressInputSchema.parse(body);
    const address = await setPrimaryAddress(userId, input);
    return NextResponse.json({ data: address });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await assertUserApi();
    const body = await request.json();
    const input = removePrimaryAddressInputSchema.parse(body);
    await removePrimaryAddress(userId, input);
    return NextResponse.json({ data: { ok: true } });
  } catch (err) {
    return handleError(err);
  }
}
