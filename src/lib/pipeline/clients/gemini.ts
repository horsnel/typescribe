/**
 * Gemini AI Review Generator
 *
 * Uses Google's Gemini API to generate high-quality, contextual movie reviews.
 * Replaces the placeholder AI review system with actual LLM-generated content.
 *
 * Features:
 *  - Context-aware reviews using all available movie data
 *  - Fallback to placeholder if Gemini is not configured or fails
 *  - Aggressive caching: in-memory + file-based (7-day TTL, survives restarts)
 *  - Same movie always gets the same cached review (deterministic by tmdb_id)
 *  - Rate limiting to respect API quotas
 *  - Prompt engineering for film-critic quality reviews
 *
 * Free tier: 15 RPM, 1M tokens/min, 1,500 RPD (Gemini 2.0 Flash)
 */

import * as fs from 'fs';
import * as path from 'path';

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
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days — aggressive caching
const RATE_LIMIT_MS = 5000; // 5s between requests
const MAX_REVIEW_TOKENS = 512;

// ─── File-based Cache (survives server restarts) ───

// On Vercel, /tmp is writable; fallback to project dir for local dev
const CACHE_DIR = process.env.VERCEL
  ? path.join('/tmp', 'gemini-reviews')
  : path.join(process.cwd(), 'data', 'gemini-reviews');

let fsAvailable = true;
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const testFile = path.join(CACHE_DIR, '.write-test');
  fs.writeFileSync(testFile, '1');
  fs.unlinkSync(testFile);
} catch {
  // Try /tmp as fallback
  const tmpDir = path.join('/tmp', 'gemini-reviews');
  try {
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    const testFile = path.join(tmpDir, '.write-test');
    fs.writeFileSync(testFile, '1');
    fs.unlinkSync(testFile);
    // Override CACHE_DIR (reassign via a let)
    (globalThis as any).__GEMINI_CACHE_DIR__ = tmpDir;
    fsAvailable = true;
  } catch {
    fsAvailable = false;
  }
}

function getCacheDir(): string {
  return (globalThis as any).__GEMINI_CACHE_DIR__ || CACHE_DIR;
}

function reviewFilePath(cacheKey: string): string {
  const sanitized = cacheKey.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getCacheDir(), `${sanitized}.json`);
}

// ─── Internal State ───

const memoryCache = new Map<string, { data: GeminiReviewResult; expiresAt: number }>();
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

// ─── Aggressive Cache: Memory → Disk → Miss ───

function getFromCache(cacheKey: string): GeminiReviewResult | null {
  // Layer 1: In-memory (fastest)
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() < memEntry.expiresAt) {
    log(`Memory cache hit for "${cacheKey}"`);
    return { ...memEntry.data, cached: true };
  }

  // Layer 2: File-based (survives restarts)
  if (fsAvailable) {
    const filePath = reviewFilePath(cacheKey);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const entry: { data: GeminiReviewResult; expiresAt: number } = JSON.parse(raw);
        if (Date.now() < entry.expiresAt) {
          // Promote to memory cache
          memoryCache.set(cacheKey, entry);
          log(`Disk cache hit for "${cacheKey}"`);
          return { ...entry.data, cached: true };
        }
        // Expired — remove from disk
        try { fs.unlinkSync(filePath); } catch {}
      }
    } catch {
      // Corrupt file — ignore
    }
  }

  return null;
}

function writeToCache(cacheKey: string, result: GeminiReviewResult): void {
  const entry = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };

  // Always write to memory
  memoryCache.set(cacheKey, entry);

  // Also persist to disk for durability across restarts
  if (fsAvailable) {
    try {
      if (!fs.existsSync(getCacheDir())) {
        fs.mkdirSync(getCacheDir(), { recursive: true });
      }
      fs.writeFileSync(reviewFilePath(cacheKey), JSON.stringify(entry, null, 2));
    } catch {
      // Silently ignore write failures (Vercel read-only)
    }
  }
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
 *
 * Aggressive caching: The same movie (by tmdb_id) always returns the same
 * cached review for 7 days. Reviews are persisted to disk so they survive
 * server restarts and Vercel re-deployments (when filesystem is available).
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

  // Aggressive cache check — memory then disk
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // If no Gemini key, return placeholder (also cache it)
  if (!apiKey) {
    log(`No API key — using placeholder for "${movie.title}"`);
    const result: GeminiReviewResult = {
      review: generatePlaceholderReview(movie),
      generatedAt: new Date().toISOString(),
      model: 'placeholder',
      cached: false,
    };
    writeToCache(cacheKey, result);
    return result;
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
      const result: GeminiReviewResult = {
        review: generatePlaceholderReview(movie),
        generatedAt: new Date().toISOString(),
        model: 'placeholder',
        cached: false,
      };
      writeToCache(cacheKey, result);
      return result;
    }

    const data = await res.json();

    // Extract review text from Gemini response
    const reviewText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      data?.candidates?.[0]?.content?.text ||
      null;

    if (!reviewText) {
      warn(`Empty response for "${movie.title}"`);
      const result: GeminiReviewResult = {
        review: generatePlaceholderReview(movie),
        generatedAt: new Date().toISOString(),
        model: 'placeholder',
        cached: false,
      };
      writeToCache(cacheKey, result);
      return result;
    }

    const result: GeminiReviewResult = {
      review: reviewText.trim(),
      generatedAt: new Date().toISOString(),
      model: MODEL,
      cached: false,
    };

    // Aggressively cache the result (7 days, persisted to disk)
    writeToCache(cacheKey, result);

    log(`Generated review for "${movie.title}" (${result.review.length} chars)`);

    return result;
  } catch (err) {
    warn(`Generation error for "${movie.title}":`, err instanceof Error ? err.message : err);
    const result: GeminiReviewResult = {
      review: generatePlaceholderReview(movie),
      generatedAt: new Date().toISOString(),
      model: 'placeholder',
      cached: false,
    };
    writeToCache(cacheKey, result);
    return result;
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

/** Clear all cached reviews (memory + disk) */
export function clearGeminiCache(): void {
  memoryCache.clear();
  if (fsAvailable) {
    try {
      if (fs.existsSync(getCacheDir())) {
        const files = fs.readdirSync(getCacheDir());
        for (const file of files) {
          if (file.endsWith('.json')) {
            try { fs.unlinkSync(path.join(getCacheDir(), file)); } catch {}
          }
        }
      }
    } catch {}
  }
  log('Cache cleared (memory + disk)');
}

/** Get cache size */
export function geminiCacheSize(): number {
  return memoryCache.size;
}

/** Get disk cache count */
export function geminiDiskCacheSize(): number {
  if (!fsAvailable) return 0;
  try {
    if (!fs.existsSync(getCacheDir())) return 0;
    return fs.readdirSync(getCacheDir()).filter(f => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}
