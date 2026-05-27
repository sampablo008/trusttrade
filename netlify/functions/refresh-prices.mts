// Netlify Scheduled Function — refreshes token USD prices in the DB.
// Pings the Next.js API route which does the actual work (uses the project's
// Supabase admin client and live price providers).
//
// Schedule: every minute (Netlify's minimum). Sub-minute freshness comes from
// the chart WS feed + per-render live HTTP fetch with a 5s in-memory cache.

const fallbackAppUrl = process.env.URL ?? process.env.DEPLOY_URL ?? "http://localhost:8888";

export default async () => {
  const appUrl = process.env.APP_URL ?? fallbackAppUrl;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.warn("[refresh-prices] CRON_SECRET unset, skipping");
    return new Response("skipped", { status: 204 });
  }

  const res = await fetch(`${appUrl}/api/cron/refresh-prices`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.text();
  if (!res.ok) {
    console.error("[refresh-prices] failed", res.status, body);
  } else {
    console.log("[refresh-prices] ok", body);
  }

  return new Response(body, { status: res.status });
};

export const config = {
  schedule: "* * * * *",
};
