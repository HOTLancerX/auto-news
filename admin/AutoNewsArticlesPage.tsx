"use client";

import { useState, useEffect, useMemo } from "react";
import { Icon } from "@iconify/react";

interface Article {
    _id: string;
    feedTitle: string;
    title: string;
    slug: string;
    status: string;
    sourceUrl: string;
    createdAt: string;
}

export default function AutoNewsArticlesPage() {
    const [articles, setArticles] = useState<Article[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchArticles();
    }, []);

    const fetchArticles = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auto-news-articles", { cache: "no-store" });
            const data = await res.json();
            setArticles(data.articles || []);
        } catch {
        } finally {
            setLoading(false);
        }
    };

    const allSelected = articles.length > 0 && selected.size === articles.length;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelected(new Set());
        } else {
            setSelected(new Set(articles.map((a) => a._id)));
        }
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this article?")) return;
        try {
            await fetch(`/api/auto-news-articles?id=${id}`, { method: "DELETE" });
            setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
            fetchArticles();
        } catch {
        }
    };

    const handleDeleteSelected = async () => {
        if (selected.size === 0) return;
        if (!confirm(`Delete ${selected.size} selected articles? This will also delete their blog posts.`)) return;
        try {
            for (const id of selected) {
                await fetch(`/api/auto-news-articles?id=${id}`, { method: "DELETE" });
            }
            setSelected(new Set());
            fetchArticles();
        } catch {
        }
    };

    const handleClearAll = async () => {
        if (!confirm("Delete ALL auto-imported articles? This cannot be undone.")) return;
        try {
            await fetch("/api/auto-news-articles?clearAll=true", { method: "DELETE" });
            setSelected(new Set());
            fetchArticles();
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
                    <h1 className="text-2xl font-bold text-gray-900">Auto-Imported Articles</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        {articles.length} total {selected.size > 0 && `• ${selected.size} selected`}
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none flex gap-2">
                    {selected.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="rounded-lg bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 flex items-center gap-2"
                        >
                            <Icon icon="solar:trash-bin-trash-bold" width={16} /> Delete Selected ({selected.size})
                        </button>
                    )}
                    {articles.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 flex items-center gap-2"
                        >
                            <Icon icon="solar:trash-bin-trash-bold" width={16} /> Clear All
                        </button>
                    )}
                </div>
            </div>

            <div className="mt-8 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={toggleSelectAll}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Feed</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source URL</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {articles.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                                    No articles found.
                                </td>
                            </tr>
                        )}
                        {articles.map((article) => (
                            <tr key={article._id} className={`hover:bg-gray-50 ${selected.has(article._id) ? "bg-blue-50" : ""}`}>
                                <td className="px-4 py-3">
                                    <input
                                        type="checkbox"
                                        checked={selected.has(article._id)}
                                        onChange={() => toggleSelect(article._id)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">
                                    {article.slug ? (
                                        <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {article.title}
                                        </a>
                                    ) : (
                                        <span className="text-gray-500">{article.title}</span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{article.feedTitle}</td>
                                <td className="px-4 py-3 text-sm max-w-xs truncate">
                                    {article.sourceUrl ? (
                                        <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                            {article.sourceUrl}
                                        </a>
                                    ) : "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                                        article.status === "published"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-red-100 text-red-800"
                                    }`}>
                                        {article.status}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">
                                    {new Date(article.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleDelete(article._id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Icon icon="solar:trash-bin-trash-bold" width={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
