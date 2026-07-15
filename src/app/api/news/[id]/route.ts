/**
 * GET /api/news/[id]
 *
 * Fetches the full article content for a news item.
 *
 * Strategy:
 *   1. Look up the article in the shared cache (populated by /api/news)
 *   2. For real URLs: fetch the page and extract article content
 *   3. On extraction failure: fall back to the article excerpt
 *
 * Previously this route also consulted a hardcoded `newsItems` array from
 * @/lib/data when the cache missed, and synthesized a fake "richer article
 * body" via `generateMockArticle` for entries whose url was '#'. Both
 * fallbacks were dead code (the shim is empty) and have been removed —
 * only real, API-sourced articles are now served.
 */
import { NextResponse } from 'next/server';

// ─── Shared article cache (populated by /api/news) ───

interface CachedArticle {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  source: string;
  date: string;
  url: string;
}

const articleCache = new Map<number, CachedArticle>();
let cacheSetAt = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/** Called by /api/news to store fetched articles for detail lookups */
export function cacheArticles(articles: CachedArticle[]): void {
  const now = Date.now();
  // Only refresh cache if expired or empty
  if (articleCache.size > 0 && now - cacheSetAt < CACHE_TTL) return;

  articleCache.clear();
  for (const article of articles) {
    articleCache.set(article.id, article);
  }
  cacheSetAt = now;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const articleId = parseInt(id, 10);

  const article = articleCache.get(articleId);

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // No URL — return the excerpt only (no mock body generation)
  if (!article.url) {
    return NextResponse.json({
      title: article.title,
      content: article.excerpt,
      source: article.source,
      date: article.date,
      image: article.image,
      url: article.url,
    });
  }

  // Real URL — try to fetch the full article content
  try {
    const res = await fetch(article.url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10_000),
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const extracted = extractArticleContent(html, article.url);

    return NextResponse.json({
      title: extracted.title || article.title,
      content: extracted.content || article.excerpt,
      source: article.source,
      date: article.date,
      image: extracted.image || article.image,
      url: article.url,
    });
  } catch {
    // Fallback to excerpt if full content can't be fetched
    return NextResponse.json({
      title: article.title,
      content: article.excerpt,
      source: article.source,
      date: article.date,
      image: article.image,
      url: article.url,
    });
  }
}

/**
 * Extract article content from raw HTML.
 */
function extractArticleContent(
  html: string,
  _url: string,
): { title: string | null; content: string; image: string | null } {
  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:article|post-content|entry-content|story-body|article-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  let title: string | null = null;
  let content = '';
  let image: string | null = null;

  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  const ogImageMatch = html.match(
    /<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*\/?>/i,
  );
  if (ogImageMatch) {
    image = ogImageMatch[1];
  }

  for (const pattern of articlePatterns) {
    const match = pattern.exec(html);
    if (match) {
      const pTags = match[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pTags && pTags.length > 0) {
        content = pTags
          .map((p) => p.replace(/<[^>]*>/g, '').trim())
          .filter((p) => p.length > 40)
          .join('\n\n');
        break;
      }
    }
  }

  if (!content) {
    const allPTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (allPTags) {
      content = allPTags
        .map((p) => p.replace(/<[^>]*>/g, '').trim())
        .filter((p) => p.length > 60)
        .slice(0, 15)
        .join('\n\n');
    }
  }

  return { title, content, image };
}
