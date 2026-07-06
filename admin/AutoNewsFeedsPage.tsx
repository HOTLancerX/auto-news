"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import Gallery from "@/components/Gallery";

interface Feed {
    _id: string;
    title: string;
    feedUrl: string;
    category: string;
    categoryTitle?: string;
    userId: string;
    language: string;
    postMode: "direct" | "ai";
    imageType: "cdn" | "cloudinary" | "cloudflare";
    defaultImage?: string;
    active: boolean;
    lastFetched: string | null;
}

interface Category {
    _id: string;
    title: string;
}

interface UserItem {
    _id: string;
    name: string;
}

export default function AutoNewsFeedsPage() {
    const [feeds, setFeeds] = useState<Feed[]>([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [users, setUsers] = useState<UserItem[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingFeed, setEditingFeed] = useState<Feed | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<string | null>(null);

    useEffect(() => {
        fetchFeeds();
        fetchCategories();
        fetchUsers();
    }, []);

    const fetchFeeds = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auto-news", { cache: "no-store" });
            const data = await res.json();
            setFeeds(data.feeds || []);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/auto-news?categories=true", { cache: "no-store" });
            const data = await res.json();
            setCategories(data.categories || []);
        } catch {
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/auto-news?users=true", { cache: "no-store" });
            const data = await res.json();
            setUsers(data.users || []);
        } catch {
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this feed? This cannot be undone.")) return;
        try {
            await fetch(`/api/auto-news?id=${id}`, { method: "DELETE" });
            fetchFeeds();
        } catch {
        }
    };

    const handleResetFeedDedup = async (id: string, title: string) => {
        if (!confirm(`Reset dedup records for "${title}"? This will allow all articles from this feed to be re-imported on the next sync. Existing posts will NOT be deleted.`)) return;
        try {
            await fetch(`/api/auto-news-articles?resetFeedDedup=${id}`, { method: "DELETE" });
            alert("Dedup records cleared. Next sync will re-import all articles from this feed.");
        } catch {
            alert("Failed to reset feed");
        }
    };

    const handleToggleActive = async (feed: Feed) => {
        try {
            await fetch(`/api/auto-news?id=${feed._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !feed.active }),
            });
            fetchFeeds();
        } catch {
        }
    };

    const handleSync = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch("/api/cron/auto-news", { cache: "no-store" });
            const data = await res.json();
            if (data.results) {
                const lines = data.results.map((r: any) =>
                    `${r.feedTitle}: ${r.posted} posted, ${r.skipped} skipped, ${r.errors} errors`
                );
                setSyncResult(`Total Posted: ${data.posted}, Skipped: ${data.skipped}, Errors: ${data.errors}\n\n${lines.join("\n")}`);
            } else {
                setSyncResult(data.error || "Sync completed");
            }
            fetchFeeds();
        } catch {
            setSyncResult("Network error during sync");
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async (formData: Partial<Feed>) => {
        try {
            if (editingFeed) {
                await fetch(`/api/auto-news?id=${editingFeed._id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });
            } else {
                await fetch("/api/auto-news", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData),
                });
            }
            setShowForm(false);
            setEditingFeed(null);
            fetchFeeds();
        } catch {
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24 text-gray-400">
                <Icon icon="svg-spinners:ring-resize" width={32} />
            </div>
        );
    }

    return (
        <div>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-bold text-gray-900">Auto News Feeds</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manage RSS feed sources for automatic blog post imports
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-400 disabled:opacity-55 flex items-center gap-2"
                    >
                        {syncing ? (
                            <><Icon icon="svg-spinners:ring-resize" width={16} /> Syncing…</>
                        ) : (
                            <><Icon icon="solar:refresh-bold" width={16} /> Sync Now</>
                        )}
                    </button>
                    <button
                        onClick={() => { setEditingFeed(null); setShowForm(true); }}
                        className="rounded-lg bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 flex items-center gap-2"
                    >
                        <Icon icon="solar:add-circle-bold" width={16} /> Add Feed
                    </button>
                </div>
            </div>

            {syncResult && (
                <div className="mt-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800 whitespace-pre-wrap">{syncResult}</p>
                    <button onClick={() => setSyncResult(null)} className="mt-2 text-xs text-blue-600 hover:underline">
                        Dismiss
                    </button>
                </div>
            )}

            <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
                <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">
                        Cron / External sync URL:
                    </p>
                    <code className="text-xs bg-white border rounded px-2 py-1 text-gray-800 break-all select-all block">
                        {typeof window !== "undefined" ? `${window.location.origin}/api/cron/auto-news` : "/api/cron/auto-news"}
                    </code>
                    <p className="text-xs text-gray-400 mt-1">
                        This URL is called automatically by Vercel Cron every 15 minutes.
                        You can also schedule it at{" "}
                        <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="underline">
                            cron-job.org
                        </a>{" "}
                        or any cron service.
                        Set <code className="bg-gray-100 px-1 rounded">CRON_SECRET</code> in your env vars to secure the endpoint.
                    </p>
                </div>
            </div>

            <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed URL</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Images</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Sync</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {feeds.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                                    No feeds configured yet. Click &quot;Add Feed&quot; to get started.
                                </td>
                            </tr>
                        )}
                        {feeds.map((feed) => (
                            <tr key={feed._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{feed.title}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{feed.feedUrl}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{feed.categoryTitle || "—"}</td>
                                <td className="px-4 py-3 text-sm text-gray-500 uppercase">{feed.language}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        feed.postMode === "ai"
                                            ? "bg-purple-100 text-purple-800"
                                            : "bg-gray-100 text-gray-800"
                                    }`}>
                                        {feed.postMode === "ai" ? "AI Summary" : "Direct"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        feed.imageType === "cloudinary"
                                            ? "bg-blue-100 text-blue-800"
                                            : feed.imageType === "cloudflare"
                                                ? "bg-purple-100 text-purple-800"
                                                : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                        {feed.imageType === "cloudinary" ? "Cloudinary" : feed.imageType === "cloudflare" ? "Cloudflare" : "CDN"}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleToggleActive(feed)}
                                        className={`px-2 py-0.5 text-xs rounded-full ${
                                            feed.active
                                                ? "bg-green-100 text-green-800"
                                                : "bg-red-100 text-red-800"
                                        }`}
                                    >
                                        {feed.active ? "Active" : "Inactive"}
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {feed.lastFetched
                                        ? new Date(feed.lastFetched).toLocaleString()
                                        : "Never"}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingFeed(feed); setShowForm(true); }}
                                            className="text-indigo-600 hover:text-indigo-900"
                                            title="Edit feed"
                                        >
                                            <Icon icon="solar:pen-bold" width={16} />
                                        </button>
                                        <button
                                            onClick={() => handleResetFeedDedup(feed._id, feed.title)}
                                            className="text-orange-500 hover:text-orange-700"
                                            title="Reset dedup — allow re-import of all articles"
                                        >
                                            <Icon icon="solar:restart-bold" width={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(feed._id)}
                                            className="text-red-600 hover:text-red-900"
                                            title="Delete feed"
                                        >
                                            <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showForm && (
                <FeedFormPopup
                    feed={editingFeed}
                    categories={categories}
                    users={users}
                    onClose={() => { setShowForm(false); setEditingFeed(null); }}
                    onSave={handleSave}
                />
            )}
        </div>
    );
}

function FeedFormPopup({
    feed,
    categories,
    users,
    onClose,
    onSave,
}: {
    feed: Feed | null;
    categories: Category[];
    users: UserItem[];
    onClose: () => void;
    onSave: (data: Partial<Feed>) => void;
}) {
    const [title, setTitle] = useState(feed?.title || "");
    const [feedUrl, setFeedUrl] = useState(feed?.feedUrl || "");
    const [category, setCategory] = useState(feed?.category || "");
    const [userId, setUserId] = useState(feed?.userId || "");
    const [language, setLanguage] = useState(feed?.language || "en");
    const [postMode, setPostMode] = useState<"direct" | "ai">(feed?.postMode || "direct");
    const [imageType, setImageType] = useState<"cdn" | "cloudinary" | "cloudflare">(feed?.imageType || "cdn");
    const [defaultImage, setDefaultImage] = useState(feed?.defaultImage || "");
    const [active, setActive] = useState(feed?.active !== false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const LANGUAGES = [
        { label: "English", value: "en" },
        { label: "Bengali", value: "bn" },
        { label: "Hindi", value: "hi" },
        { label: "Arabic", value: "ar" },
        { label: "Spanish", value: "es" },
        { label: "French", value: "fr" },
        { label: "German", value: "de" },
        { label: "Portuguese", value: "pt" },
        { label: "Turkish", value: "tr" },
        { label: "Russian", value: "ru" },
        { label: "Japanese", value: "ja" },
        { label: "Chinese", value: "zh" },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !feedUrl) {
            setError("Title and Feed URL are required");
            return;
        }
        setSaving(true);
        setError("");
        onSave({
            title,
            feedUrl,
            category: category || undefined,
            userId,
            language,
            postMode,
            imageType,
            defaultImage: imageType === "cdn" ? defaultImage : "",
            active,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold mb-4">
                    {feed ? "Edit Feed" : "Add New Feed"}
                </h2>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">RSS Feed URL *</label>
                        <input
                            type="url"
                            value={feedUrl}
                            onChange={(e) => setFeedUrl(e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                            placeholder="https://example.com/feed.xml"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Blog Post Category</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="">Select category</option>
                            {categories.map((cat) => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Post as User</label>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="">Select user</option>
                            {users.map((user) => (
                                <option key={user._id} value={user._id}>
                                    {user.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400">Posts will be attributed to this user.</p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Language</label>
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Post Mode</label>
                        <select
                            value={postMode}
                            onChange={(e) => setPostMode(e.target.value as "direct" | "ai")}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                        >
                            <option value="direct">Direct (post feed content as-is)</option>
                            <option value="ai">AI Summarize (rewrite with AI)</option>
                        </select>
                        <p className="text-xs text-gray-400">
                            {postMode === "ai"
                                ? "Articles will be summarized and rewritten using AI before posting."
                                : "Articles will be posted directly from the RSS feed."}
                        </p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold">Image Handling</label>
                        <div className="flex gap-3">
                            <label className={`flex-1 flex items-center gap-2.5 rounded-lg border px-4 py-3 cursor-pointer transition ${
                                imageType === "cdn"
                                    ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}>
                                <input
                                    type="radio"
                                    name="imageType"
                                    value="cdn"
                                    checked={imageType === "cdn"}
                                    onChange={() => setImageType("cdn")}
                                    className="accent-emerald-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">CDN</span>
                                    <span className="text-xs text-gray-400">Save image URL directly</span>
                                </div>
                            </label>
                            <label className={`flex-1 flex items-center gap-2.5 rounded-lg border px-4 py-3 cursor-pointer transition ${
                                imageType === "cloudinary"
                                    ? "border-blue-400 bg-blue-50 text-blue-800"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}>
                                <input
                                    type="radio"
                                    name="imageType"
                                    value="cloudinary"
                                    checked={imageType === "cloudinary"}
                                    onChange={() => setImageType("cloudinary")}
                                    className="accent-blue-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Cloudinary</span>
                                    <span className="text-xs text-gray-400">Download &amp; upload to Cloudinary</span>
                                </div>
                            </label>
                            <label className={`flex-1 flex items-center gap-2.5 rounded-lg border px-4 py-3 cursor-pointer transition ${
                                imageType === "cloudflare"
                                    ? "border-purple-400 bg-purple-50 text-purple-800"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            }`}>
                                <input
                                    type="radio"
                                    name="imageType"
                                    value="cloudflare"
                                    checked={imageType === "cloudflare"}
                                    onChange={() => setImageType("cloudflare")}
                                    className="accent-purple-500"
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">Cloudflare</span>
                                    <span className="text-xs text-gray-400">Download &amp; upload to R2</span>
                                </div>
                            </label>
                        </div>

                        {imageType === "cdn" && (
                            <p className="text-xs text-gray-400">
                                The original image URL from the feed will be saved directly in the database.
                            </p>
                        )}

                        {(imageType === "cloudinary" || imageType === "cloudflare") && (
                            <div className="flex flex-col gap-1.5">
                                <p className="text-xs text-gray-400">
                                    Select a default image from the library. During sync, feed images will be downloaded and uploaded to {imageType === "cloudinary" ? "Cloudinary" : "Cloudflare R2"}.
                                </p>
                                <Gallery
                                    multiple={false}
                                    value={defaultImage}
                                    onChange={(v) => setDefaultImage(typeof v === "string" ? v : (v[0] || ""))}
                                    placeholder="Select default image from library"
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="feed-active"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="feed-active" className="text-sm font-medium">
                            Active (enabled for sync)
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 mt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-55 flex items-center gap-2"
                        >
                            {saving && <Icon icon="svg-spinners:ring-resize" width={16} />}
                            {feed ? "Save Changes" : "Create Feed"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
