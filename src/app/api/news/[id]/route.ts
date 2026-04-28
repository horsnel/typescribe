import { NextResponse } from 'next/server';
import { newsItems } from '@/lib/data';

/**
 * GET /api/news/[id]
 *
 * Fetches the full article content for a news item.
 * - For real URLs: fetches the page and extracts article content
 * - For mock data (url === '#'): generates a richer article body from the excerpt
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  const article = newsItems.find((n) => n.id === articleId);

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  // Mock data — generate a richer article body from the excerpt
  if (article.url === '#') {
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
 * Tries common article selectors, then falls back to <p> tags.
 */
function extractArticleContent(
  html: string,
  _url: string,
): { title: string | null; content: string; image: string | null } {
  // Simple extraction — look for common article containers
  const articlePatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<div[^>]*class="[^"]*(?:article|post-content|entry-content|story-body|article-body)[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ];

  let title: string | null = null;
  let content = '';
  let image: string | null = null;

  // Extract title
  const titleMatch = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]*>/g, '').trim();
  }

  // Extract og:image
  const ogImageMatch = html.match(
    /<meta[^>]*property="og:image"[^>]*content="([^"]*)"[^>]*\/?>/i,
  );
  if (ogImageMatch) {
    image = ogImageMatch[1];
  }

  // Extract article body
  for (const pattern of articlePatterns) {
    const match = pattern.exec(html);
    if (match) {
      // Extract all <p> tags from the matched container
      const pTags = match[1].match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
      if (pTags && pTags.length > 0) {
        content = pTags
          .map((p) => p.replace(/<[^>]*>/g, '').trim())
          .filter((p) => p.length > 40) // Filter out short/non-content paragraphs
          .join('\n\n');
        break;
      }
    }
  }

  // Fallback: extract all meaningful <p> tags from the entire page
  if (!content) {
    const allPTags = html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
    if (allPTags) {
      content = allPTags
        .map((p) => p.replace(/<[^>]*>/g, '').trim())
        .filter((p) => p.length > 60)
        .slice(0, 15) // Limit to first 15 paragraphs
        .join('\n\n');
    }
  }

  return { title, content, image };
}

/**
 * Generate a richer mock article body from an excerpt.
 * Creates multi-paragraph content that expands on the excerpt.
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
