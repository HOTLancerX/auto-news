import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import AutoNewsFeed from "../models/AutoNewsFeed";
import AutoNewsArticle from "../models/AutoNewsArticle";
import AutoNewsSettings from "../models/AutoNewsSettings";
import Post from "@/models/post";
import PostInfo from "@/models/post_info";
import { parseRSSFeed, fetchOGImage } from "./rssParser";
import { summarizeArticle } from "./aiSummarize";
import { downloadAndUploadImage, createSlug } from "./imageHandler";
import { getLibrariesCollection } from "@/models/Library";

export interface SyncResult {
    feedId: string;
    feedTitle: string;
    total: number;
    posted: number;
    skipped: number;
    errors: number;
}

/**
 * Returns the set of article URLs that are already in the database.
 * Any RSS item whose URL matches one of these will be skipped.
 * Any RSS item whose URL is NOT in this set will be posted.
 */
async function getPostedArticleUrls(): Promise<Set<string>> {
    const articles = await AutoNewsArticle.find({}, { articleUrl: 1 }).lean();
    return new Set(articles.map((a) => a.articleUrl));
}

/**
 * Sync all active feeds, respecting the global `postsPerRun` setting.
 */
export async function syncAllFeeds(): Promise<SyncResult[]> {
    await connectDB();

    // Read the global postsPerRun limit (default 1 if not configured)
    const settingsDoc = await AutoNewsSettings.findOne().lean();
    const postsPerRun = Math.max(1, settingsDoc?.postsPerRun || 1);

    const feeds = await AutoNewsFeed.find({ active: true }).lean();
    const results: SyncResult[] = [];

    for (const feed of feeds) {
        try {
            const result = await syncSingleFeed(String(feed._id), postsPerRun);
            results.push(result);
        } catch {
            results.push({
                feedId: String(feed._id),
                feedTitle: feed.title,
                total: 0,
                posted: 0,
                skipped: 0,
                errors: 1,
            });
        }
    }

    return results;
}

/**
 * Sync one feed, posting at most `postsPerRun` new articles.
 * Articles whose URLs are already in `AutoNewsArticle` are skipped (dedup).
 */
export async function syncSingleFeed(feedId: string, postsPerRun = 1): Promise<SyncResult> {
    await connectDB();

    const feed = await AutoNewsFeed.findById(feedId).lean();
    if (!feed) throw new Error("Feed not found");

    const result: SyncResult = {
        feedId,
        feedTitle: feed.title,
        total: 0,
        posted: 0,
        skipped: 0,
        errors: 0,
    };

    const items = await parseRSSFeed(feed.feedUrl);
    if (items.length === 0) return result;

    result.total = items.length;

    // Load already-posted URLs so we can skip duplicates
    const postedUrls = await getPostedArticleUrls();

    for (const item of items) {
        // Stop once we've posted the allowed number of new articles this run
        if (result.posted >= postsPerRun) break;

        if (!item.link || !item.title) {
            result.errors++;
            continue;
        }

        // Duplicate check — skip if already imported
        if (postedUrls.has(item.link)) {
            result.skipped++;
            continue;
        }

        let postTitle = item.title;
        let postContent = item.description;

        if (feed.postMode === "ai") {
            try {
                const summarized = await summarizeArticle(
                    item.title,
                    item.description,
                    feed.language
                );
                postTitle = summarized.title;
                postContent = summarized.content;
            } catch (err) {
                console.error("[auto-news] AI summarize error:", err);
                result.errors++;
                continue;
            }
        }

        // --- Image resolution ---
        let imageUrl = item.image;

        // No image in feed → try OG meta from the article page
        if (!imageUrl && item.link) {
            imageUrl = await fetchOGImage(item.link);
        }

        // Still no image → fall back to the feed's default image
        if (!imageUrl && feed.defaultImage) {
            imageUrl = feed.defaultImage;
        }

        // Upload to cloud storage when configured
        if (imageUrl && (feed.imageType === "cloudinary" || feed.imageType === "cloudflare")) {
            const uploadedUrl = await downloadAndUploadImage(imageUrl, feed.imageType);
            if (uploadedUrl) {
                // Register in the media library
                const libraries = await getLibrariesCollection();
                await libraries.insertOne({
                    name: `auto-news-${Date.now()}`,
                    url: uploadedUrl,
                    type: feed.imageType,
                    status: "active",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                imageUrl = uploadedUrl;
            }
        }

        // --- Create the blog post ---
        const baseSlug = createSlug(postTitle) || `auto-news-${Date.now()}`;
        const slugExists = await Post.findOne({ slug: baseSlug }).lean();
        const finalSlug = slugExists ? `${baseSlug}-${Date.now()}` : baseSlug;

        const newPost = new Post({
            title: postTitle,
            slug: finalSlug,
            type: "blog",
            category: feed.category || null,
            status: "published",
            userId: feed.userId || "",
        });

        await newPost.save();

        const postId = newPost._id;

        // Persist all extra fields as PostInfo key-value rows
        const infoEntries = [
            { name: "description", value: postContent },
            { name: "images",      value: imageUrl ? JSON.stringify([imageUrl]) : "[]" },
            { name: "sourceUrl",   value: item.link },
        ];

        for (const entry of infoEntries) {
            await PostInfo.findOneAndUpdate(
                { postId, name: entry.name },
                { postId, name: entry.name, value: entry.value },
                { upsert: true }
            );
        }

        // Record the article URL so it is never re-imported
        await AutoNewsArticle.findOneAndUpdate(
            { articleUrl: item.link },
            {
                feedId: new mongoose.Types.ObjectId(feedId),
                articleUrl: item.link,
                title: item.title,
                posted: true,
                postId,
            },
            { upsert: true }
        );

        result.posted++;
        postedUrls.add(item.link); // Prevent within-run re-import if same URL appears twice
    }

    await AutoNewsFeed.findByIdAndUpdate(feedId, { lastFetched: new Date() });

    return result;
}
