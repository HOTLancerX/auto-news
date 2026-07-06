import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import AutoNewsArticle from "@/plugin/auto-news/models/AutoNewsArticle";
import AutoNewsFeed from "@/plugin/auto-news/models/AutoNewsFeed";
import Post from "@/models/post";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const articles = await AutoNewsArticle.find({ posted: true })
            .sort({ createdAt: -1 })
            .lean();

        const feedIdSet = new Set<string>();
        for (const a of articles) {
            if (a.feedId) feedIdSet.add(String(a.feedId));
        }
        const feedIds = [...feedIdSet];

        let feedMap = new Map<string, string>();
        if (feedIds.length > 0) {
            try {
                const feeds = await AutoNewsFeed.find({ _id: { $in: feedIds } }).lean();
                for (const f of feeds) {
                    feedMap.set(String(f._id), f.title);
                }
            } catch {}
        }

        const postIdSet = new Set<string>();
        for (const a of articles) {
            if (a.postId) postIdSet.add(String(a.postId));
        }
        const postIds = [...postIdSet];

        let postMap = new Map<string, { title: string; slug: string; status: string }>();
        if (postIds.length > 0) {
            try {
                const posts = await Post.find({ _id: { $in: postIds } })
                    .select("_id title slug status")
                    .lean();
                for (const p of posts) {
                    postMap.set(String(p._id), {
                        title: (p as any).title,
                        slug: (p as any).slug,
                        status: (p as any).status,
                    });
                }
            } catch {}
        }

        const enriched = articles.map((a) => {
            const postId = a.postId ? String(a.postId) : null;
            const post = postId ? postMap.get(postId) : null;
            const feedId = a.feedId ? String(a.feedId) : "";
            return {
                _id: String(a._id),
                feedTitle: feedMap.get(feedId) || "Unknown",
                title: post?.title || a.title || "Untitled",
                slug: post?.slug || "",
                status: post?.status || "deleted",
                sourceUrl: a.articleUrl || "",
                createdAt: a.createdAt || new Date(),
            };
        });

        return NextResponse.json({ articles: enriched });
    } catch (err) {
        console.error("AutoNewsArticles GET error:", err);
        return NextResponse.json({ articles: [], error: String(err) }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const url = new URL(req.url);

        // Clear all articles (and their posts) for a specific feed
        if (url.searchParams.get("resetFeed")) {
            const feedId = url.searchParams.get("resetFeed");
            const articles = await AutoNewsArticle.find({ feedId }).lean();
            const postIds = articles.map((a) => a.postId).filter(Boolean);
            if (postIds.length > 0) {
                await Post.deleteMany({ _id: { $in: postIds } });
            }
            await AutoNewsArticle.deleteMany({ feedId });
            return NextResponse.json({ success: true, deleted: articles.length });
        }

        // Clear dedup records only for a feed (keep the posts)
        if (url.searchParams.get("resetFeedDedup")) {
            const feedId = url.searchParams.get("resetFeedDedup");
            const result = await AutoNewsArticle.deleteMany({ feedId });
            return NextResponse.json({ success: true, deleted: result.deletedCount });
        }

        if (url.searchParams.get("clearAll") === "true") {
            const articles = await AutoNewsArticle.find({}).lean();
            const postIds: string[] = [];
            for (const a of articles) {
                if (a.postId) postIds.push(String(a.postId));
            }
            if (postIds.length > 0) {
                await Post.deleteMany({ _id: { $in: postIds } });
            }
            await AutoNewsArticle.deleteMany({});
            return NextResponse.json({ success: true, deleted: articles.length });
        }

        const id = url.searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const article = await AutoNewsArticle.findById(id).lean();
        if (!article) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        if (article.postId) {
            await Post.findByIdAndDelete(article.postId);
        }
        await AutoNewsArticle.findByIdAndDelete(id);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("AutoNewsArticles DELETE error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
