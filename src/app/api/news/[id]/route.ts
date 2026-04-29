/**
 * GET /api/news/[id]
 *
 * Fetches the full article content for a news item.
 * Works with both mock data and dynamically fetched API articles.
 *
 * Strategy:
 *   1. Check the shared article cache (populated by /api/news)
 *   2. Fall back to static mock data
 *   3. For real URLs: fetch the page and extract article content
 *   4. For mock data (url === '#'): generate a richer article body
 */
import { NextResponse } from 'next/server';
import { newsItems } from '@/lib/data';

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

  // Step 1: Check the shared article cache first (API-sourced articles)
  const cachedArticle = articleCache.get(articleId);

  // Step 2: Fall back to static mock data
  const mockArticle = newsItems.find((n) => n.id === articleId);

  const article = cachedArticle || mockArticle;

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Mock data — generate a richer article body from the excerpt
  if (article.url === '#' || !article.url) {
    const richContent = generateMockArticle(article.title, article.excerpt, article.source, article.date);
    return NextResponse.json({
      title: article.title,
      content: richContent,
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

/**
 * Generate a richer mock article body from an excerpt.
 */
function generateMockArticle(
  title: string,
  excerpt: string,
  source: string,
  date: string,
): string {
  const paragraphs = [
    excerpt,
    `The story has captured significant attention across the film industry, with commentators and analysts weighing in on what this means for the broader landscape of cinema. Industry veterans note that developments like these reflect the ongoing evolution of how films are made, distributed, and received by audiences worldwide.`,
    `Speaking to ${source}, a prominent industry figure described the current moment as "a pivotal inflection point" for the entertainment business. "We're seeing shifts that will define the next decade of filmmaking," they explained. "The intersection of technology, audience expectations, and creative vision has never been more dynamic."`,
    `The implications extend beyond the immediate story. Several major studios have already signaled that they are watching these developments closely, with some suggesting that their own strategies may need to adapt in response. The ripple effects are expected to be felt across multiple sectors of the industry, from production and distribution to marketing and exhibition.`,
    `Audience reactions have been mixed but largely positive, with social media buzz reflecting both excitement and thoughtful consideration of the broader issues at play. Fan communities have been particularly vocal, sharing perspectives that range from enthusiastic support to measured skepticism.`,
    `Looking ahead, analysts predict that this trend will continue to gain momentum throughout the coming year. With several high-profile projects already in development that align with these shifts, the industry appears poised for a period of significant transformation. As one veteran producer put it, "The only constant in this business is change — and right now, the pace of change is unprecedented."`,
  ];

  return paragraphs.join('\n\n');
}
