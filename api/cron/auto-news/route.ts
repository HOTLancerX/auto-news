/**
 * /api/cron/auto-news
 *
 * Called automatically by Vercel Cron every 15 minutes (see vercel.json).
 * Can also be called externally by any cron service (cron-job.org, etc.).
 *
 * When CRON_SECRET is set in env vars, requests must include
 *   Authorization: Bearer <CRON_SECRET>
 * so the endpoint cannot be triggered by random visitors.
 *
 * On Vercel the platform injects the Authorization header automatically for
 * scheduled invocations, so no extra setup is needed there.
 */

import { NextRequest, NextResponse } from "next/server";
import { syncAllFeeds } from "@/plugin/auto-news/lib/feedProcessor";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes — plenty for large feed runs

export async function GET(req: NextRequest) {
    // ── Optional secret check ─────────────────────────────────────────────────
    const secret = process.env.CRON_SECRET;
    if (secret) {
        const authHeader = req.headers.get("authorization");
        if (authHeader !== `Bearer ${secret}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
    }

    try {
        const results = await syncAllFeeds();
        const totalPosted  = results.reduce((s, r) => s + r.posted,  0);
        const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);
        const totalErrors  = results.reduce((s, r) => s + r.errors,  0);

        console.log(
            `[auto-news cron] posted=${totalPosted} skipped=${totalSkipped} errors=${totalErrors}`
        );

        return NextResponse.json({
            success: true,
            posted:  totalPosted,
            skipped: totalSkipped,
            errors:  totalErrors,
            results,
        });
    } catch (err) {
        console.error("[auto-news cron] fatal error:", err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Sync failed" },
            { status: 500 }
        );
    }
}
