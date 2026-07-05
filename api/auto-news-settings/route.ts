import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AutoNewsSettings from "@/plugin/auto-news/models/AutoNewsSettings";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        await connectDB();
        let doc = await AutoNewsSettings.findOne().lean();
        if (!doc) {
            doc = (await AutoNewsSettings.create({})).toObject();
        }
        return NextResponse.json({
            settings: {
                "auto-news-api-url": doc.apiUrl || "",
                "auto-news-api-key": doc.apiKey || "",
                "auto-news-model": doc.aiModel || "gpt-3.5-turbo",
                "auto-news-language": doc.language || "en",
                "auto-news-posts-per-run": String(doc.postsPerRun || 1),
            },
        });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        const update: Record<string, any> = {};
        if ("auto-news-api-url" in body) update.apiUrl = body["auto-news-api-url"];
        if ("auto-news-api-key" in body) update.apiKey = body["auto-news-api-key"];
        if ("auto-news-model" in body) update.aiModel = body["auto-news-model"];
        if ("auto-news-language" in body) update.language = body["auto-news-language"];
        if ("auto-news-posts-per-run" in body) update.postsPerRun = parseInt(body["auto-news-posts-per-run"]) || 1;

        await AutoNewsSettings.findOneAndUpdate({}, update, { upsert: true });
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        if (body.action === "test-connection") {
            const { apiUrl, apiKey, model } = body;

            if (!apiUrl || !apiKey) {
                return NextResponse.json(
                    { success: false, error: "API URL and Key are required" },
                    { status: 400 }
                );
            }

            const baseUrl = apiUrl.replace(/\/+$/, "");
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model || "gpt-3.5-turbo",
                    messages: [{ role: "user", content: "Hello" }],
                    max_tokens: 5,
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                return NextResponse.json({
                    success: false,
                    error: `API ${response.status}: ${errText.slice(0, 200)}`,
                });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : "Failed" },
            { status: 500 }
        );
    }
}
