import { NextResponse } from 'next/server';
import { getEntertainmentHeadlines as getNewsApiHeadlines, getMovieNews as getNewsApiMovieNews } from '@/lib/pipeline/clients/newsapi';
import { getEntertainmentHeadlines as getNewsDataHeadlines, getMovieNews as getNewsDataMovieNews, isNewsDataConfigured } from '@/lib/pipeline/clients/newsdata';
import { newsItems } from '@/lib/data';

interface FormattedArticle {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  source: string;
  date: string;
  url: string;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * News strategy: Merge results from BOTH NewsAPI and NewsData.io,
 * with each acting as a fallback for the other.
 *
 * 1. Try NewsAPI first (if configured)
 * 2. Try NewsData.io (if configured) — always try, not just when NewsAPI fails
 * 3. Merge & deduplicate results
 * 4. Fall back to mock data only if BOTH APIs return nothing
 */
export async function GET() {
  const articles: FormattedArticle[] = [];
  const seen = new Set<string>();

  // ── Collect from NewsAPI ──
  let newsApiArticles: FormattedArticle[] = [];
  const newsApiKey = process.env.NEWS_API_KEY;
  if (newsApiKey) {
    try {
      const [headlines, movieNews] = await Promise.all([
        getNewsApiHeadlines(),
        getNewsApiMovieNews('movies OR film OR cinema OR hollywood'),
      ]);

      const combined = [...headlines, ...movieNews];

      for (const a of combined) {
        if (!a.title || seen.has(a.title.toLowerCase())) continue;
        seen.add(a.title.toLowerCase());

        newsApiArticles.push({
          id: 0, // will be assigned below
          title: a.title,
          excerpt: a.description || '',
          image: a.imageUrl || '',  // empty string = no image, handled by UI
          source: a.source || 'NewsAPI',
          date: formatDate(a.publishedAt),
          url: a.url,
        });
      }
    } catch (err) {
      console.error('[/api/news] NewsAPI error:', err);
    }
  }

  // ── Collect from NewsData.io (always try, not just when NewsAPI failed) ──
  let newsDataArticles: FormattedArticle[] = [];
  if (isNewsDataConfigured()) {
    try {
      const [headlines, movieNews] = await Promise.all([
        getNewsDataHeadlines(),
        getNewsDataMovieNews('movies film hollywood'),
      ]);

      const combined = [...headlines, ...movieNews];

      for (const a of combined) {
        const title = a.title;
        if (!title || seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());

        newsDataArticles.push({
          id: 0,
          title,
          excerpt: a.description || '',
          image: a.image_url || '',  // empty string = no image, handled by UI
          source: a.source_id || 'NewsData.io',
          date: formatDate(a.pubDate || new Date().toISOString()),
          url: a.link,
        });
      }
    } catch (err) {
      console.error('[/api/news] Newsdata.io error:', err);
    }
  }

  // ── Merge: NewsAPI results first, then NewsData supplements ──
  const mergedArticles = [...newsApiArticles, ...newsDataArticles];

  // Assign IDs
  for (let i = 0; i < mergedArticles.length; i++) {
    mergedArticles[i].id = i + 1;
  }

  articles.push(...mergedArticles);

  // ── Determine source label ──
  let source = 'mock';
  if (newsApiArticles.length > 0 && newsDataArticles.length > 0) {
    source = 'newsapi+newsdata';
  } else if (newsApiArticles.length > 0) {
    source = 'newsapi';
  } else if (newsDataArticles.length > 0) {
    source = 'newsdata';
  }

  // ── Fall back to mock data only if BOTH APIs returned nothing ──
  if (articles.length === 0) {
    for (const item of newsItems) {
      articles.push({
        id: item.id,
        title: item.title,
        excerpt: item.excerpt,
        image: item.image,
        source: item.source,
        date: item.date,
        url: item.url,
      });
    }
    source = 'mock';
  }

  return NextResponse.json({
    articles,
    source,
    count: articles.length,
  });
}
