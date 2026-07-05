import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AutoNewsFeed from "@/plugin/auto-news/models/AutoNewsFeed";
import Cat from "@/models/cat";
import User from "@/models/Users";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);

        const id = url.searchParams.get("id");
        if (id) {
            const feed = await AutoNewsFeed.findById(id).lean();
            if (!feed) {
                return NextResponse.json({ error: "Feed not found" }, { status: 404 });
            }
            return NextResponse.json({ feed: { ...feed, _id: String(feed._id) } });
        }

        if (url.searchParams.get("categories") === "true") {
            const cats = await Cat.find({ type: "blog-category", status: "published" })
                .select("_id title")
                .lean();
            return NextResponse.json({
                categories: cats.map((c) => ({ _id: String(c._id), title: c.title })),
            });
        }

        if (url.searchParams.get("users") === "true") {
            const users = await User.find({ status: "active" })
                .select("_id name")
                .sort({ name: 1 })
                .lean();
            return NextResponse.json({
                users: users.map((u) => ({ _id: String(u._id), name: u.name })),
            });
        }

        const feeds = await AutoNewsFeed.find().sort({ createdAt: -1 }).lean();

        const feedIds = feeds.map((f) => f.category).filter(Boolean);
        const cats = feedIds.length > 0
            ? await Cat.find({ _id: { $in: feedIds } }).lean()
            : [];
        const catMap = new Map(cats.map((c) => [String(c._id), c.title]));

        const enriched = feeds.map((f) => ({
            ...f,
            _id: String(f._id),
            category: f.category ? String(f.category) : "",
            categoryTitle: f.category ? catMap.get(String(f.category)) || "" : "",
        }));

        return NextResponse.json({ feeds: enriched });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to fetch feeds" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        const { title, feedUrl, category, userId, language, postMode, imageType, defaultImage, active } = body;

        if (!title || !feedUrl) {
            return NextResponse.json(
                { error: "Title and Feed URL are required" },
                { status: 400 }
            );
        }

        const feed = new AutoNewsFeed({
            title,
            feedUrl,
            category: category || null,
            userId: userId || "",
            language: language || "en",
            postMode: postMode || "direct",
            imageType: imageType || "cdn",
            defaultImage: defaultImage || "",
            active: active !== false,
        });

        await feed.save();

        return NextResponse.json({ feed }, { status: 201 });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to create feed" },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const body = await req.json();
        const feed = await AutoNewsFeed.findByIdAndUpdate(id, body, { new: true }).lean();
        if (!feed) {
            return NextResponse.json({ error: "Feed not found" }, { status: 404 });
        }
        return NextResponse.json({ feed: { ...feed, _id: String(feed._id) } });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);
        const id = url.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }
        await AutoNewsFeed.findByIdAndDelete(id);
        return NextResponse.json({ success: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed" },
            { status: 500 }
        );
    }
}
