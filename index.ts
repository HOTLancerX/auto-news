import { addHook, type PluginMeta } from "@/hook";
import AutoNewsSettingsPage from "./settings/AutoNewsSettingsPage";
import AutoNewsFeedsPage from "./admin/AutoNewsFeedsPage";
import AutoNewsArticlesPage from "./admin/AutoNewsArticlesPage";

export const PLUGINS: PluginMeta = {
    nx: "com.system.auto-news",
    name: "auto-news",
    version: "1.0.0",
    description: "Automated RSS feed to blog post converter with AI summarization.",
    author: "System",
    path: "https://github.com/HOTLancerX/auto-news.git",
    icon: "solar:widget-bold",
    color: "from-emerald-500 to-teal-600",
};

export function register() {
    addHook("admin.nav", [
        {
            key: "auto-news",
            label: "Auto News",
            icon: "solar:widget-bold",
            slug: "auto-news",
            parent: "",
            position: 25,
        },
        {
            key: "auto-news-feeds",
            label: "Feeds",
            icon: "solar:rss-bold",
            slug: "auto-news/feeds",
            parent: "auto-news",
            position: 1,
        },
        {
            key: "auto-news-settings",
            label: "AI Settings",
            icon: "solar:settings-bold",
            slug: "auto-news/settings",
            parent: "auto-news",
            position: 2,
        },
    ], PLUGINS.nx);

    addHook("admin.pages", [
        {
            key: "auto-news/feeds",
            label: "Auto News Feeds",
            style: "left",
            position: 50,
            path: AutoNewsFeedsPage,
        },
        {
            key: "auto-news/settings",
            label: "Auto News Settings",
            style: "left",
            position: 51,
            path: AutoNewsSettingsPage,
        },
        {
            key: "auto-news",
            label: "Auto News Articles",
            style: "left",
            position: 52,
            path: AutoNewsArticlesPage,
        },
    ], PLUGINS.nx);
}
