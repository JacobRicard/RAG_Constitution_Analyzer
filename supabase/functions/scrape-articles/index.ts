import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.81.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("AI_API_KEY")!;

// ─── RSS feed sources ─────────────────────────────────────────────────────────
// Wire: searches and category pages that return MUSG-relevant articles
const WIRE_FEEDS = [
  "https://marquettewire.org/?s=MUSG&feed=rss2&paged={page}",
  "https://marquettewire.org/?s=student+government&feed=rss2&paged={page}",
  "https://marquettewire.org/category/news/student-government/feed/",
];

// today.marquette.edu: institutional announcements mentioning MUSG / student gov
const TODAY_FEEDS = [
  "https://today.marquette.edu/?s=MUSG&feed=rss2",
  "https://today.marquette.edu/?s=student+senate&feed=rss2",
  "https://today.marquette.edu/?s=student+government&feed=rss2",
  "https://today.marquette.edu/category/student-life/feed/",
];

const RSS_PAGES = 5; // how many pages to fetch per paginated feed

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function safeFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Parse <item> elements from an RSS feed string. */
function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; description: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; description: string }> = [];

  const rawItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  for (const raw of rawItems) {
    const body = raw[1];

    const title = (body.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ||
      body.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? "";
    const link = (body.match(/<link>([\s\S]*?)<\/link>/) || [])[1] ?? "";
    const pubDate = (body.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] ?? "";
    const description =
      (body.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ||
        body.match(/<description>([\s\S]*?)<\/description>/) || [])[1] ?? "";

    if (title && link) {
      items.push({
        title: title.trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#8217;/g, "'").replace(/&#8216;/g, "'").replace(/&#8220;/g, '"').replace(/&#8221;/g, '"'),
        link: link.trim(),
        pubDate: pubDate.trim(),
        description,
      });
    }
  }
  return items;
}

/** Extract plain-text article body from a WordPress HTML page. */
function extractArticleText(html: string): string {
  // Remove script, style, nav, header, footer, aside, form blocks first
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ");

  // Try to isolate the main article content
  const contentRegions = [
    /<article[\s\S]*?>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*article-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ];

  let extracted = "";
  for (const re of contentRegions) {
    const m = cleaned.match(re);
    if (m && m[1].length > 200) {
      extracted = m[1];
      break;
    }
  }
  if (!extracted) extracted = cleaned;

  // Strip remaining HTML tags and decode entities
  const text = extracted
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/\s{2,}/g, " ")
    .trim();

  // Truncate to 6000 chars so embeddings stay within token limits
  return text.length > 6000 ? text.substring(0, 6000) + "…" : text;
}

/** Generate an OpenAI embedding for a text chunk. */
async function embed(text: string): Promise<number[] | null> {
  try {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.substring(0, 8000),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error("Embedding error", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return data.data?.[0]?.embedding ?? null;
  } catch (e) {
    console.error("Embedding exception", e);
    return null;
  }
}

/** Return true if the article is MUSG-relevant (title or description mentions it). */
function isMusgRelevant(title: string, description: string): boolean {
  const haystack = (title + " " + description).toLowerCase();
  return (
    haystack.includes("musg") ||
    haystack.includes("student government") ||
    haystack.includes("student senate") ||
    haystack.includes("student association") ||
    haystack.includes("legislative vice president") ||
    haystack.includes("student president") ||
    haystack.includes("student fee") ||
    haystack.includes("student organization") ||
    haystack.includes("student election") ||
    haystack.includes("marquette student")
  );
}

// ─── Main scraping logic ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const maxPages: number = Math.min(body.pages ?? RSS_PAGES, 10);

    // Collect all article URLs to process from RSS feeds
    const articleMap = new Map<string, { title: string; pubDate: string; description: string; source: string }>();

    // ── Wire feeds ──
    for (const feedTemplate of WIRE_FEEDS) {
      const paginated = feedTemplate.includes("{page}");
      const pages = paginated ? maxPages : 1;

      for (let page = 1; page <= pages; page++) {
        const url = feedTemplate.replace("{page}", String(page));
        const xml = await safeFetch(url);
        if (!xml) break;

        const items = parseRssItems(xml);
        if (items.length === 0) break; // no more pages

        for (const item of items) {
          if (
            item.link.startsWith("https://marquettewire.org/") &&
            isMusgRelevant(item.title, item.description) &&
            !articleMap.has(item.link)
          ) {
            articleMap.set(item.link, {
              title: item.title,
              pubDate: item.pubDate,
              description: item.description,
              source: "marquette_wire",
            });
          }
        }
      }
    }

    // ── today.marquette.edu feeds ──
    for (const feedUrl of TODAY_FEEDS) {
      const xml = await safeFetch(feedUrl);
      if (!xml) continue;

      const items = parseRssItems(xml);
      for (const item of items) {
        if (
          item.link.startsWith("https://today.marquette.edu/") &&
          isMusgRelevant(item.title, item.description) &&
          !articleMap.has(item.link)
        ) {
          articleMap.set(item.link, {
            title: item.title,
            pubDate: item.pubDate,
            description: item.description,
            source: "today_marquette",
          });
        }
      }
    }

    console.log(`Found ${articleMap.size} MUSG-relevant articles across all feeds`);

    // Check which URLs we've already scraped
    const urls = [...articleMap.keys()];
    const { data: existing } = await supabase
      .from("precedent_articles")
      .select("url")
      .in("url", urls);
    const existingUrls = new Set((existing ?? []).map((r: any) => r.url));

    const toProcess = urls.filter((u) => !existingUrls.has(u));
    console.log(`${toProcess.length} new articles to process (${existingUrls.size} already stored)`);

    let added = 0;
    let failed = 0;

    for (const url of toProcess) {
      const meta = articleMap.get(url)!;

      // Fetch and extract article text
      const html = await safeFetch(url);
      if (!html) { failed++; continue; }

      const content = extractArticleText(html);
      if (content.length < 100) { failed++; continue; }

      // Build embedding input: title + content excerpt
      const embeddingInput = `${meta.title}\n\n${content}`;
      const embedding = await embed(embeddingInput);
      if (!embedding) { failed++; continue; }

      // Parse published date
      let published_at: string | null = null;
      if (meta.pubDate) {
        try { published_at = new Date(meta.pubDate).toISOString(); } catch { /* ignore */ }
      }

      // Upsert into Supabase
      const { error } = await supabase.from("precedent_articles").upsert({
        url,
        title: meta.title,
        source: meta.source,
        content,
        published_at,
        scraped_at: new Date().toISOString(),
        embedding: JSON.stringify(embedding),
      }, { onConflict: "url" });

      if (error) {
        console.error(`Failed to upsert ${url}:`, error.message);
        failed++;
      } else {
        added++;
        console.log(`✓ [${meta.source}] ${meta.title.substring(0, 60)}`);
      }

      // Small delay to be polite to the servers
      await new Promise((r) => setTimeout(r, 300));
    }

    return new Response(
      JSON.stringify({
        found: articleMap.size,
        already_stored: existingUrls.size,
        added,
        failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Scrape error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Scraping failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
