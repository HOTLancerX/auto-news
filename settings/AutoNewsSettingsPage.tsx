"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

interface Settings {
    "auto-news-api-url": string;
    "auto-news-api-key": string;
    "auto-news-model": string;
    "auto-news-language": string;
    "auto-news-posts-per-run": string;
}

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

export default function AutoNewsSettingsPage() {
    const [settings, setSettings] = useState<Settings>({
        "auto-news-api-url": "",
        "auto-news-api-key": "",
        "auto-news-model": "gpt-3.5-turbo",
        "auto-news-language": "en",
        "auto-news-posts-per-run": "1",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        fetch("/api/auto-news-settings", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => {
                if (data.settings) {
                    setSettings((prev) => ({
                        ...prev,
                        "auto-news-api-url": data.settings["auto-news-api-url"] || "",
                        "auto-news-api-key": data.settings["auto-news-api-key"] || "",
                        "auto-news-model": data.settings["auto-news-model"] || "gpt-3.5-turbo",
                        "auto-news-language": data.settings["auto-news-language"] || "en",
                        "auto-news-posts-per-run": data.settings["auto-news-posts-per-run"] || "1",
                    }));
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const handleChange = (key: keyof Settings, value: string) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage("");
        try {
            const res = await fetch("/api/auto-news-settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            });
            const data = await res.json();
            if (!res.ok) {
                setMessage(`Error: ${data.error || "Failed to save"}`);
            } else {
                setMessage("Settings saved successfully!");
                setTimeout(() => setMessage(""), 3000);
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Network error");
        } finally {
            setSaving(false);
        }
    };

    const handleTestApi = async () => {
        setTesting(true);
        setMessage("");
        try {
            const res = await fetch("/api/auto-news-settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "test-connection",
                    apiUrl: settings["auto-news-api-url"],
                    apiKey: settings["auto-news-api-key"],
                    model: settings["auto-news-model"],
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage("API connection successful!");
            } else {
                setMessage(`Error: ${data.error || "Connection failed"}`);
            }
        } catch (err) {
            setMessage(err instanceof Error ? err.message : "Network error while testing connection");
        } finally {
            setTesting(false);
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
        <div className="max-w-3xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Auto News Settings</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Configure AI API settings for automatic blog post summarization.
                </p>
            </div>

            {message && (
                <div className={`mb-5 rounded-lg px-4 py-3 text-sm font-medium border ${
                    message.startsWith("Error")
                        ? "bg-red-400/10 text-red-400 border-red-400/25"
                        : "bg-emerald-400/10 text-emerald-400 border-emerald-400/25"
                }`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">API Base URL</label>
                        <input
                            type="text"
                            value={settings["auto-news-api-url"]}
                            onChange={(e) => handleChange("auto-news-api-url", e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="https://api.openai.com/v1"
                        />
                        <p className="text-xs text-gray-400">
                            OpenAI-compatible API endpoint. Supports OpenAI, Azure, local LLMs, etc.
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">API Key</label>
                        <input
                            type="password"
                            value={settings["auto-news-api-key"]}
                            onChange={(e) => handleChange("auto-news-api-key", e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="sk-..."
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Model Name</label>
                        <input
                            type="text"
                            value={settings["auto-news-model"]}
                            onChange={(e) => handleChange("auto-news-model", e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                            placeholder="gpt-3.5-turbo"
                        />
                        <p className="text-xs text-gray-400">
                            Model to use for summarization (e.g. gpt-4, gpt-3.5-turbo, llama-3)
                        </p>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Default Language</label>
                        <select
                            value={settings["auto-news-language"]}
                            onChange={(e) => handleChange("auto-news-language", e.target.value)}
                            className="appearance-none w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        >
                            {LANGUAGES.map((lang) => (
                                <option key={lang.value} value={lang.value}>
                                    {lang.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold">Posts Per Cron Run</label>
                        <input
                            type="number"
                            min="1"
                            max="50"
                            value={settings["auto-news-posts-per-run"]}
                            onChange={(e) => handleChange("auto-news-posts-per-run", e.target.value)}
                            className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition focus:border-indigo-500"
                        />
                        <p className="text-xs text-gray-400">
                            Number of posts to process per feed per cron execution
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleTestApi}
                            disabled={testing || !settings["auto-news-api-url"] || !settings["auto-news-api-key"]}
                            className="rounded-lg bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-55 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {testing ? (
                                <><Icon icon="svg-spinners:ring-resize" width={16} /> Testing…</>
                            ) : (
                                <><Icon icon="solar:wifi-bold" width={16} /> Test Connection</>
                            )}
                        </button>

                        <button
                            type="submit"
                            disabled={saving}
                            className="rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-55 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {saving ? (
                                <><Icon icon="svg-spinners:ring-resize" width={16} /> Saving…</>
                            ) : (
                                <><Icon icon="solar:check-circle-bold" width={16} /> Save Settings</>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
