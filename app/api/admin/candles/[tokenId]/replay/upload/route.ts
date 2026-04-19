import { ApiClientError } from "@/lib/api/client";
import { assertAdminApi } from "@/lib/auth/assert-admin-api";
import { getOptionalServerEnv } from "@/lib/env/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface RouteContext {
  params: Promise<{ tokenId: string }>;
}

interface CsvRow {
  close: number;
  high: number;
  low: number;
  open: number;
  time: number;
  volume: number;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });

    const open = parseFloat(row.open ?? row.o ?? "");
    const high = parseFloat(row.high ?? row.h ?? "");
    const low = parseFloat(row.low ?? row.l ?? "");
    const close = parseFloat(row.close ?? row.c ?? "");
    const volume = parseFloat(row.volume ?? row.v ?? "0");
    const time = parseInt(row.time ?? row.timestamp ?? row.t ?? "0", 10);

    if ([open, high, low, close].some((v) => !isFinite(v) || v <= 0)) continue;

    rows.push({
      close: Math.round(close * 100),
      high: Math.round(Math.max(open, high, low, close) * 100),
      low: Math.round(Math.max(1, Math.min(open, high, low, close) * 100)),
      open: Math.round(open * 100),
      time,
      volume: isFinite(volume) ? volume : 0,
    });
  }

  return rows;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    await assertAdminApi();

    const { tokenId } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ApiClientError("CSV file is required.", 400, "FILE_REQUIRED");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new ApiClientError("File exceeds 5 MB limit.", 413, "TOO_LARGE");
    }

    const text = await file.text();
    const rows = parseCsv(text);

    if (!rows.length) {
      throw new ApiClientError("No valid rows found in CSV.", 400, "INVALID_CSV");
    }

    if (!getOptionalServerEnv()) {
      return Response.json({ data: { imported: rows.length, tokenId } });
    }

    const adminClient = createSupabaseAdminClient();

    // Clear existing replay bank for this token
    await adminClient.from("candle_replay_bank").delete().eq("token_id", tokenId);

    const insertRows = rows.map((row, index) => ({
      close_cents: row.close,
      high_cents: row.high,
      low_cents: row.low,
      open_cents: row.open,
      row_index: index,
      source_time: row.time ? new Date(row.time * 1000).toISOString() : null,
      token_id: tokenId,
      volume: row.volume,
    }));

    // Insert in batches of 500
    const BATCH_SIZE = 500;
    for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
      const batch = insertRows.slice(i, i + BATCH_SIZE);
      const { error } = await adminClient.from("candle_replay_bank").insert(batch);
      if (error) {
        throw new ApiClientError(error.message, 500, "REPLAY_IMPORT_FAILED", error);
      }
    }

    // Reset replay state
    await adminClient.from("token_replay_state").upsert(
      {
        cursor_index: 0,
        replay_speed: 1,
        status: "idle",
        token_id: tokenId,
      },
      { onConflict: "token_id" },
    );

    return Response.json({ data: { imported: insertRows.length, tokenId } });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "REPLAY_UPLOAD_BAD_REQUEST", message: "Replay upload failed." } },
      { status: 400 },
    );
  }
}
