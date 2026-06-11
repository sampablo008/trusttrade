import type { NextRequest } from "next/server";


const HEARTBEAT_MS = 25_000;

const WS_HOSTS = [
  "wss://data-stream.binance.vision:9443/ws",
  "wss://stream.binance.com:9443/ws",
];

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const symbol = (searchParams.get("symbol") ?? "").toLowerCase();

  if (!/^[a-z0-9]{3,20}$/.test(symbol)) {
    return new Response("invalid symbol", { status: 400 });
  }

  const streamName = `${symbol}@ticker`;
  const encoder = new TextEncoder();

  let ws: WebSocket | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      const shutdown = () => {
        if (closed) return;
        closed = true;
        if (heartbeat !== null) clearInterval(heartbeat);
        try { ws?.close(); } catch {}
        try { controller.close(); } catch {}
      };

      safeEnqueue(": ok\n\n");
      heartbeat = setInterval(() => safeEnqueue(": hb\n\n"), HEARTBEAT_MS);

      const connect = (hostIdx: number) => {
        if (closed) return;
        const host = WS_HOSTS[hostIdx] ?? WS_HOSTS[0];
        ws = new WebSocket(`${host}/${streamName}`);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(
              typeof ev.data === "string" ? ev.data : ev.data.toString(),
            ) as Record<string, unknown>;
            safeEnqueue(`event: ticker\ndata: ${JSON.stringify(msg)}\n\n`);
          } catch {}
        };
        ws.onerror = () => {};
        ws.onclose = () => {
          if (closed) return;
          if (hostIdx + 1 < WS_HOSTS.length) {
            connect(hostIdx + 1);
          } else {
            shutdown();
          }
        };
      };

      connect(0);

      req.signal.addEventListener("abort", shutdown);
    },
    cancel() {
      closed = true;
      if (heartbeat !== null) clearInterval(heartbeat);
      try { ws?.close(); } catch {}
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
