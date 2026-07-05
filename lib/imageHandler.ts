import { uploadToCloudinary, uploadToCloudflareR2 } from "@/lib/imageUpload";

export async function downloadAndUploadImage(
    imageUrl: string,
    uploadType: "cloudinary" | "cloudflare" = "cloudinary"
): Promise<string> {
    try {
        const response = await fetch(imageUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AutoNewsBot/1.0",
            },
        });

        if (!response.ok) return "";

        const buffer = Buffer.from(await response.arrayBuffer());
        const fileName = `auto-news-${Date.now()}`;

        const uploadFn = uploadType === "cloudflare"
            ? uploadToCloudflareR2
            : uploadToCloudinary;

        const result = await uploadFn(buffer, fileName, "library");
        return result.url;
    } catch {
        return "";
    }
}

export function createSlug(title: string): string {
    if (!title) return "";
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-|-$)/g, "");
}
