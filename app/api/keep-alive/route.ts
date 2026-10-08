import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * GET /api/keep-alive
 *
 * Called on a schedule (via Vercel Cron) to prevent the Supabase free-tier
 * project from being auto-paused due to inactivity (Supabase pauses projects
 * after ~1 week of no traffic).
 *
 * Pings the Supabase REST health endpoint with the service-role key so the
 * request registers as authenticated activity.
 *
 * Protected by CRON_SECRET so it can only be triggered by Vercel Cron or
 * an authorised caller — not by random internet requests.
 */
export async function GET(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // ── Ping Supabase ─────────────────────────────────────────────────────────
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Supabase environment variables are not configured." },
      { status: 500 }
    );
  }

  const pingUrl = `${supabaseUrl}/rest/v1/`;

  try {
    const res = await fetch(pingUrl, {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      // Short timeout — we only care that the project responds, not the payload
      signal: AbortSignal.timeout(10_000),
    });

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "keep_alive_ping",
        status: res.status,
        ok: res.ok,
      })
    );

    return NextResponse.json({
      success: true,
      message: "Supabase keep-alive ping sent.",
      supabaseStatus: res.status,
    });
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown error";

    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        event: "keep_alive_ping_failed",
        reason,
      })
    );

    return NextResponse.json(
      { success: false, error: `Ping failed: ${reason}` },
      { status: 502 }
    );
  }
}
