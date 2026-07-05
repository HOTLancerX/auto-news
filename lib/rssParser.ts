import { parseString } from "xml2js";

export interface FeedItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    guid: string;
    image: string;
}

export async function parseRSSFeed(url: string): Promise<FeedItem[]> {
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoNewsBot/1.0",
        },
        next: { revalidate: 0 },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch feed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();

    const result = await new Promise<any>((resolve, reject) => {
        parseString(xmlText, { explicitArray: false }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });

    const items: FeedItem[] = [];

    const channel = result?.rss?.channel || result?.feed;
    if (!channel) return items;

    let rawItems = channel.item || channel.entry || [];
    if (!Array.isArray(rawItems)) rawItems = [rawItems];

    for (const item of rawItems) {
        const title = item.title?._ || item.title || "";
        const link = item.link?.$?.href || item.link?.[0]?.$?.href || item.link?.[0] || item.link || "";
        const pubDate = item.pubDate || item.updated || item.published || "";
        const guid = item.guid?._ || item.guid || item.id || "";

        const contentEncoded = item["content:encoded"] || "";
        const description = contentEncoded || item.description?._ || item.description || item.summary || "";

        let image = "";
        if (item["media:content"]?.$?.url) {
            image = item["media:content"].$.url;
        } else if (item["media:thumbnail"]?.$?.url) {
            image = item["media:thumbnail"].$.url;
        } else if (item.enclosure?.$?.url && item.enclosure?.$?.type?.startsWith("image")) {
            image = item.enclosure.$.url;
        }

        if (title && link) {
            items.push({
                title: typeof title === "string" ? title : title._ || "",
                link: typeof link === "string" ? link : "",
                description,
                pubDate: typeof pubDate === "string" ? pubDate : "",
                guid: typeof guid === "string" ? guid : "",
                image,
            });
        }
    }

    return items;
}

export async function fetchOGImage(pageUrl: string): Promise<string> {
    try {
        const response = await fetch(pageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoNewsBot/1.0",
            },
            next: { revalidate: 0 },
        });

        if (!response.ok) return "";

        const html = await response.text();

        const ogMatch = html.match(
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
        );
        if (ogMatch?.[1]) return ogMatch[1];

        const twitterMatch = html.match(
            /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
        );
        if (twitterMatch?.[1]) return twitterMatch[1];

        return "";
    } catch {
        return "";
    }
}
