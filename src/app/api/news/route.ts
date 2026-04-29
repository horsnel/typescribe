import { NextResponse } from 'next/server';
import { getEntertainmentHeadlines as getNewsApiHeadlines, getMovieNews as getNewsApiMovieNews } from '@/lib/pipeline/clients/newsapi';
import { getEntertainmentHeadlines as getNewsDataHeadlines, getMovieNews as getNewsDataMovieNews, isNewsDataConfigured } from '@/lib/pipeline/clients/newsdata';
import { newsItems } from '@/lib/data';
import { cacheArticles } from './[id]/route';

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
 * News strategy: Parallel fetch from BOTH NewsAPI and NewsData.io,
 * with each acting as a fallback for the other.
 *
 * 1. Run NewsAPI + NewsData in PARALLEL (not sequential)
 * 2. Merge & deduplicate results
 * 3. Prioritize articles WITH images (better UX)
 * 4. Fall back to mock data only if BOTH APIs return nothing
 *
 * This ensures:
 * - If one API is down, the other still works (fallback)
 * - Maximum article coverage from both sources
 * - Articles with images appear first for better presentation
 * - Fast response (parallel fetching, not sequential)
 */
export async function GET() {
  const seen = new Set<string>();

  // ── Run BOTH APIs in parallel for maximum speed and coverage ──
  const [newsApiResult, newsDataResult] = await Promise.allSettled([
    fetchNewsApi(),
    fetchNewsData(),
  ]);

  const newsApiArticles = newsApiResult.status === 'fulfilled' ? newsApiResult.value : [];
  const newsDataArticles = newsDataResult.status === 'fulfilled' ? newsDataResult.value : [];

  if (newsApiResult.status === 'rejected') {
    console.error('[/api/news] NewsAPI error:', newsApiResult.reason);
  }
  if (newsDataResult.status === 'rejected') {
    console.error('[/api/news] NewsData.io error:', newsDataResult.reason);
  }

  // ── Merge: deduplicate by title, keep both sources ──
  const mergedArticles: FormattedArticle[] = [];

  // Add NewsAPI articles first (generally higher quality images)
  for (const a of newsApiArticles) {
    if (!a.title || seen.has(a.title.toLowerCase())) continue;
    seen.add(a.title.toLowerCase());
    mergedArticles.push(a);
  }

  // Add NewsData articles as supplements (fill gaps)
  for (const a of newsDataArticles) {
    if (!a.title || seen.has(a.title.toLowerCase())) continue;
    seen.add(a.title.toLowerCase());
    mergedArticles.push(a);
  }

  // ── Sort: articles WITH images first (better UX) ──
  mergedArticles.sort((a, b) => {
    const aHasImage = a.image && a.image.length > 0 ? 1 : 0;
    const bHasImage = b.image && b.image.length > 0 ? 1 : 0;
    return bHasImage - aHasImage;
  });

  // Assign sequential IDs after sorting
  for (let i = 0; i < mergedArticles.length; i++) {
    mergedArticles[i].id = i + 1;
  }

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
  const articles: FormattedArticle[] = [...mergedArticles];
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

  // ── Cache articles for the /api/news/[id] detail endpoint ──
  cacheArticles(articles);

  return NextResponse.json({
    articles,
    source,
    count: articles.length,
  });
}

/**
 * Fetch from NewsAPI.org — returns formatted articles.
 * Returns empty array on failure (not thrown) for fallback behavior.
 */
async function fetchNewsApi(): Promise<FormattedArticle[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) return [];

  const [headlines, movieNews] = await Promise.all([
    getNewsApiHeadlines(),
    getNewsApiMovieNews('movies OR film OR cinema OR hollywood'),
  ]);

  const articles: FormattedArticle[] = [];
  for (const a of [...headlines, ...movieNews]) {
    if (!a.title) continue;
    articles.push({
      id: 0, // assigned later
      title: a.title,
      excerpt: a.description || '',
      image: a.imageUrl || '',
      source: a.source || 'NewsAPI',
      date: formatDate(a.publishedAt),
      url: a.url,
    });
  }
  return articles;
}

/**
 * Fetch from NewsData.io — returns formatted articles.
 * Returns empty array on failure (not thrown) for fallback behavior.
 */
async function fetchNewsData(): Promise<FormattedArticle[]> {
  if (!isNewsDataConfigured()) return [];

  const [headlines, movieNews] = await Promise.all([
    getNewsDataHeadlines(),
    getNewsDataMovieNews('movies film hollywood'),
  ]);

  const articles: FormattedArticle[] = [];
  for (const a of [...headlines, ...movieNews]) {
    if (!a.title) continue;
    articles.push({
      id: 0, // assigned later
      title: a.title,
      excerpt: a.description || '',
      image: a.image_url || '',
      source: a.source_id || 'NewsData.io',
      date: formatDate(a.pubDate || new Date().toISOString()),
      url: a.link,
    });
  }
  return articles;
}
