/**
 * Gemini AI Review Generator
 *
 * Uses Google's Gemini API to generate high-quality, contextual movie reviews.
 * Replaces the placeholder AI review system with actual LLM-generated content.
 *
 * Features:
 *  - Context-aware reviews using all available movie data
 *  - Fallback to placeholder if Gemini is not configured or fails
 *  - 24h cache to avoid regenerating reviews for the same movie
 *  - Rate limiting to respect API quotas
 *  - Prompt engineering for film-critic quality reviews
 *
 * Free tier: 15 RPM, 1M tokens/min, 1,500 RPD (Gemini 2.0 Flash)
 */

// ─── Types ───

export interface GeminiReviewResult {
  review: string;
  generatedAt: string;
  model: string;
  cached: boolean;
}

// ─── Config ───

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-2.0-flash';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_MS = 5000; // 5s between requests
const MAX_REVIEW_TOKENS = 512;

// ─── Internal State ───

const cache = new Map<string, { data: GeminiReviewResult; expiresAt: number }>();
let lastRequestAt = 0;

// ─── Helpers ───

function getApiKey(): string {
  return process.env.GEMINI_API_KEY || '';
}

export function isGeminiConfigured(): boolean {
  return !!getApiKey();
}

async function enforceRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise(r => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastRequestAt = Date.now();
}

function log(...args: unknown[]): void {
  console.log('[Gemini]', ...args);
}

function warn(...args: unknown[]): void {
  console.warn('[Gemini]', ...args);
}

// ─── Prompt Engineering ───

function buildReviewPrompt(movie: {
  title?: string;
  overview?: string;
  genres?: Array<{ name: string }>;
  director?: string;
  tagline?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  imdb_rating?: string;
  rotten_tomatoes?: string;
  metascore?: string;
  rt_consensus?: string;
  cast?: Array<{ name: string; character: string }>;
  origin_country?: string;
  original_language?: string;
  media_type?: string;
  episodes?: number;
}): string {
  const year = movie.release_date ? movie.release_date.split('-')[0] : '';
  const genreStr = movie.genres?.map(g => g.name).join(', ') || 'various genres';
  const isTv = movie.media_type === 'tv';
  const castStr = movie.cast?.slice(0, 5).map(c => c.name).join(', ') || '';

  return `You are a thoughtful film critic writing for a general movie review website. Write a balanced, insightful review of ${isTv ? 'the TV series' : 'the film'} "${movie.title}"${year ? ` (${year})` : ''}.

Key details:
- Genres: ${genreStr}
- Director: ${movie.director || 'Unknown'}
- Runtime: ${movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'Unknown'}
- ${isTv ? `Episodes: ${movie.episodes || 'Unknown'}` : ''}
- Cast: ${castStr || 'Unknown'}
- Country: ${movie.origin_country || 'Unknown'}
- TMDb Rating: ${movie.vote_average || 'N/A'}/10
${movie.imdb_rating ? `- IMDb Rating: ${movie.imdb_rating}/10` : ''}
${movie.rotten_tomatoes ? `- Rotten Tomatoes: ${movie.rotten_tomatoes}` : ''}
${movie.metascore ? `- Metascore: ${movie.metascore}/100` : ''}
${movie.rt_consensus ? `- Critics Consensus: "${movie.rt_consensus}"` : ''}
${movie.tagline ? `- Tagline: "${movie.tagline}"` : ''}

${movie.overview ? `Synopsis: ${movie.overview}` : ''}

Requirements:
1. Write 2-3 paragraphs (200-350 words total)
2. Be balanced — discuss both strengths and weaknesses
3. Reference specific elements (acting, direction, cinematography, writing) where possible
4. Avoid spoilers
5. Use an accessible but informed tone
6. Do NOT start with "This film" or "This movie" — vary your opening
7. End with a brief overall assessment
8. Do not use quotation marks around the title after the first mention`;
}

// ─── Core Generation ───

/**
 * Generate an AI review for a movie using Gemini.
 * Falls back to a placeholder review if Gemini is unavailable.
 */
export async function generateAIReview(movie: {
  title?: string;
  overview?: string;
  genres?: Array<{ name: string }>;
  director?: string;
  tagline?: string;
  release_date?: string;
  runtime?: number;
  vote_average?: number;
  imdb_rating?: string;
  rotten_tomatoes?: string;
  metascore?: string;
  rt_consensus?: string;
  cast?: Array<{ name: string; character: string }>;
  origin_country?: string;
  original_language?: string;
  media_type?: string;
  episodes?: number;
  tmdb_id?: number;
}): Promise<GeminiReviewResult> {
  const apiKey = getApiKey();
  const cacheKey = `review:${movie.tmdb_id || movie.title}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) {
    log(`Cache hit for "${movie.title}"`);
    return { ...cached.data, cached: true };
  }

  // If no Gemini key, return placeholder
  if (!apiKey) {
    log(`No API key — using placeholder for "${movie.title}"`);
    return {
      review: generatePlaceholderReview(movie),
      generatedAt: new Date().toISOString(),
      model: 'placeholder',
      cached: false,
    };
  }

  await enforceRateLimit();

  const url = `${GEMINI_BASE}/${MODEL}:generateContent?key=${apiKey}`;

  const prompt = buildReviewPrompt(movie);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: MAX_REVIEW_TOKENS,
          topP: 0.9,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      warn(`HTTP ${res.status} for "${movie.title}" — ${body.slice(0, 200)}`);
      return {
        review: generatePlaceholderReview(movie),
        generatedAt: new Date().toISOString(),
        model: 'placeholder',
        cached: false,
      };
    }

    const data = await res.json();

    // Extract review text from Gemini response
    const reviewText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.text ||
      null;

    if (!reviewText) {
      warn(`Empty response for "${movie.title}"`);
      return {
        review: generatePlaceholderReview(movie),
        generatedAt: new Date().toISOString(),
        model: 'placeholder',
        cached: false,
      };
    }

    const result: GeminiReviewResult = {
      review: reviewText.trim(),
      generatedAt: new Date().toISOString(),
      model: MODEL,
      cached: false,
    };

    // Cache the result
    cache.set(cacheKey, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });

    log(`Generated review for "${movie.title}" (${result.review.length} chars)`);

    return result;
  } catch (err) {
    warn(`Generation error for "${movie.title}":`, err instanceof Error ? err.message : err);
    return {
      review: generatePlaceholderReview(movie),
      generatedAt: new Date().toISOString(),
      model: 'placeholder',
      cached: false,
    };
  }
}

// ─── Placeholder Review (fallback) ───

function generatePlaceholderReview(movie: {
  title?: string;
  overview?: string;
  genres?: Array<{ name: string }>;
  director?: string;
  tagline?: string;
  vote_average?: number;
  rt_consensus?: string;
}): string {
  const parts: string[] = [];

  if (movie.title) {
    const genreStr = movie.genres?.map(g => g.name).join('/') || 'film';
    parts.push(`${movie.title} is a ${genreStr} production that showcases the art of cinematic storytelling.`);
  }

  if (movie.rt_consensus) {
    parts.push(`Critics consensus: ${movie.rt_consensus}`);
  } else if (movie.vote_average && movie.vote_average >= 7.5) {
    parts.push('Critics and audiences have responded positively, with strong ratings across platforms suggesting a worthwhile viewing experience.');
  } else if (movie.vote_average && movie.vote_average >= 6) {
    parts.push('The film has received mixed-to-positive reviews from critics and audiences alike, offering an experience that may resonate differently depending on personal taste.');
  } else if (movie.vote_average) {
    parts.push('Reviews have been divided, with some finding merit in its ambitions while others feel it falls short of its potential.');
  }

  if (movie.director) {
    parts.push(`Director ${movie.director} brings a distinct vision to the material.`);
  }

  if (movie.overview) {
    const firstSentence = movie.overview.split('.')[0];
    parts.push(firstSentence + '.');
  }

  if (movie.tagline) {
    parts.push(`As the tagline goes: "${movie.tagline}"`);
  }

  if (parts.length === 0) {
    return 'A compelling cinematic experience that showcases the art of filmmaking and storytelling at its finest.';
  }

  return parts.join(' ');
}

/** Clear all cached reviews */
export function clearGeminiCache(): void {
  cache.clear();
  log('Cache cleared');
}

/** Get cache size */
export function geminiCacheSize(): number {
  return cache.size;
}
