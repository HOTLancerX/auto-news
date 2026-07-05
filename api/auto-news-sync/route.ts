import { NextResponse } from "next/server";
import { syncAllFeeds } from "@/plugin/auto-news/lib/feedProcessor";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const results = await syncAllFeeds();
        const totalPosted = results.reduce((sum, r) => sum + r.posted, 0);
        const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
        const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

        return NextResponse.json({
            success: true,
            posted: totalPosted,
            skipped: totalSkipped,
            errors: totalErrors,
            results,
        });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Sync failed" },
            { status: 500 }
        );
    }
}
