import { type NextRequest, NextResponse } from "next/server";

const FALLBACK = "/login";

export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? FALLBACK;
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : FALLBACK;
  return NextResponse.redirect(new URL(safeNext, request.url));
}
