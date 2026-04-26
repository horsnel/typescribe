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
 * Try NewsAPI first, then Newsdata.io, then fall back to mock data.
 */
export async function GET() {
  const articles: FormattedArticle[] = [];
  let source = 'mock';

  // 1. Try NewsAPI
  const newsApiKey = process.env.NEWS_API_KEY;
  if (newsApiKey) {
    try {
      const [headlines, movieNews] = await Promise.all([
        getNewsApiHeadlines(),
        getNewsApiMovieNews('movies OR film OR cinema OR hollywood'),
      ]);

      const combined = [...headlines, ...movieNews];
      const seen = new Set<string>();

      for (const a of combined) {
        if (!a.title || seen.has(a.title.toLowerCase())) continue;
        seen.add(a.title.toLowerCase());

        articles.push({
          id: articles.length + 1,
          title: a.title,
          excerpt: a.description || '',
          image: a.imageUrl || '/images/news-1.jpg',
          source: a.source || 'NewsAPI',
          date: formatDate(a.publishedAt),
          url: a.url,
        });
      }

      if (articles.length > 0) {
        source = 'newsapi';
      }
    } catch (err) {
      console.error('[/api/news] NewsAPI error:', err);
    }
  }

  // 2. Try Newsdata.io
  if (articles.length === 0 && isNewsDataConfigured()) {
    try {
      const [headlines, movieNews] = await Promise.all([
        getNewsDataHeadlines(),
        getNewsDataMovieNews('movies film hollywood'),
      ]);

      const combined = [...headlines, ...movieNews];
      const seen = new Set<string>();

      for (const a of combined) {
        const title = a.title;
        if (!title || seen.has(title.toLowerCase())) continue;
        seen.add(title.toLowerCase());

        articles.push({
          id: articles.length + 1,
          title,
          excerpt: a.description || '',
          image: a.image_url || '/images/news-1.jpg',
          source: a.source_id || 'Newsdata.io',
          date: formatDate(a.pubDate || new Date().toISOString()),
          url: a.link,
        });
      }

      if (articles.length > 0) {
        source = 'newsdata';
      }
    } catch (err) {
      console.error('[/api/news] Newsdata.io error:', err);
    }
  }

  // 3. Fall back to mock data
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
