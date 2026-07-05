import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import AutoNewsFeed from "../models/AutoNewsFeed";
import AutoNewsArticle from "../models/AutoNewsArticle";
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

async function getValidArticleUrls(): Promise<Set<string>> {
    const articles = await AutoNewsArticle.find({}).lean();
    const postIds = articles.map((a) => a.postId).filter(Boolean);

    const existingPostIds = new Set(
        postIds.length > 0
            ? (await Post.find({ _id: { $in: postIds } }).select("_id").lean()).map((p) => String(p._id))
            : []
    );

    const validUrls = new Set<string>();
    for (const article of articles) {
        if (article.postId && existingPostIds.has(String(article.postId))) {
            validUrls.add(article.articleUrl);
        } else {
            await AutoNewsArticle.deleteOne({ _id: article._id });
        }
    }

    return validUrls;
}

export async function syncAllFeeds(): Promise<SyncResult[]> {
    await connectDB();

    const feeds = await AutoNewsFeed.find({ active: true }).lean();
    const results: SyncResult[] = [];

    for (const feed of feeds) {
        try {
            const result = await syncSingleFeed(String(feed._id));
            results.push(result);
        } catch (err) {
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

export async function syncSingleFeed(feedId: string): Promise<SyncResult> {
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
    const validUrls = await getValidArticleUrls();

    for (const item of items) {
        if (!item.link || !item.title) {
            result.errors++;
            continue;
        }

        if (validUrls.has(item.link)) {
            result.skipped++;
            continue;
        }

        let postTitle = item.title;
        let postContent = item.description;

        if (feed.postMode === "ai") {
            try {
                const summarized = await summarizeArticle(item.title, item.description, feed.language);
                postTitle = summarized.title;
                postContent = summarized.content;
            } catch {
                result.errors++;
                continue;
            }
        }

        let imageUrl = item.image;
        if (!imageUrl && item.link) {
            imageUrl = await fetchOGImage(item.link);
        }
        if (!imageUrl && feed.defaultImage) {
            imageUrl = feed.defaultImage;
        }

        if (imageUrl && (feed.imageType === "cloudinary" || feed.imageType === "cloudflare")) {
            const uploadedUrl = await downloadAndUploadImage(imageUrl, feed.imageType);
            if (uploadedUrl) {
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

        const slug = createSlug(postTitle) || `auto-news-${Date.now()}`;
        const existingSlug = await Post.findOne({ slug }).lean();
        const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

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

        const infoEntries = [
            { name: "description", value: postContent },
            { name: "shortDescription", value: postContent.replace(/<[^>]+>/g, " ").slice(0, 200) },
            { name: "images", value: imageUrl ? JSON.stringify([imageUrl]) : "[]" },
            { name: "sourceUrl", value: item.link },
            { name: "autoNews", value: "true" },
        ];

        for (const entry of infoEntries) {
            await PostInfo.findOneAndUpdate(
                { postId, name: entry.name },
                { postId, name: entry.name, value: entry.value },
                { upsert: true }
            );
        }

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
        validUrls.add(item.link);
    }

    await AutoNewsFeed.findByIdAndUpdate(feedId, { lastFetched: new Date() });

    return result;
}
