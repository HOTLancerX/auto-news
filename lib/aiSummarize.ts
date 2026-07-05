import connectDB from "@/lib/mongodb";
import AutoNewsSettings from "../models/AutoNewsSettings";

export interface SummarizeResult {
    title: string;
    content: string;
    shortDescription: string;
}

export async function summarizeArticle(
    title: string,
    content: string,
    language: string
): Promise<SummarizeResult> {
    await connectDB();
    const doc = await AutoNewsSettings.findOne().lean();

    const apiUrl = doc?.apiUrl || "";
    const apiKey = doc?.apiKey || "";
    const model = doc?.aiModel || "gpt-3.5-turbo";

    if (!apiUrl || !apiKey) {
        throw new Error("Auto News API URL and Key are required in settings");
    }

    const langMap: Record<string, string> = {
        en: "English",
        bn: "Bengali",
        hi: "Hindi",
        ar: "Arabic",
        es: "Spanish",
        fr: "French",
        de: "German",
        pt: "Portuguese",
        tr: "Turkish",
        ru: "Russian",
        ja: "Japanese",
        zh: "Chinese",
    };

    const langName = langMap[language] || language;

    const cleanContent = content
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 3000);

    const prompt = `You are a professional blog post writer. Summarize the following article into a well-written blog post in ${langName} language.

Requirements:
1. Write an engaging, SEO-friendly title
2. Write the full blog post content (HTML formatted, 300-800 words)
3. Maintain the original meaning but rewrite in your own words
4. Add proper paragraph structure with <p> tags
5. Use headings where appropriate

Original Article:
Title: ${title}
Content: ${cleanContent}

Respond ONLY with a JSON object, no other text:
{"title":"your title","content":"full HTML blog post"}`;

    const baseUrl = apiUrl.replace(/\/+$/, "");
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "system",
                    content: "You are a professional blog writer. Always respond with valid JSON.",
                },
                { role: "user", content: prompt },
            ],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    console.log("[auto-news] AI raw response:", JSON.stringify(data).slice(0, 1000));
    const text = data.choices?.[0]?.message?.content || "";

    let cleaned = text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error("AI response did not contain valid JSON. Raw text: " + (text || "(empty)").slice(0, 500));
    }

    let jsonStr = jsonMatch[0];

    try {
        const result = JSON.parse(jsonStr) as SummarizeResult;
        return {
            title: result.title || title,
            content: result.content || content,
            shortDescription: "",
        };
    } catch {
        const lastBrace = jsonStr.lastIndexOf("}");
        if (lastBrace > 0) {
            jsonStr = jsonStr.slice(0, lastBrace + 1);
            const result = JSON.parse(jsonStr) as SummarizeResult;
            return {
                title: result.title || title,
                content: result.content || content,
                shortDescription: "",
            };
        }
        throw new Error("AI response JSON is malformed");
    }
}
