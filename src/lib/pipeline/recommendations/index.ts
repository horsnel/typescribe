/**
 * Multi-Source Recommendation Merger
 *
 * Combines recommendations from multiple sources, deduplicates by TMDb ID,
 * and returns the best 8 movies with proper poster images.
 *
 * Pipeline (free-first):
 *   1. TMDb Recommendations (free API) — fast primary
 *   2. TMDb Similar (free API) — fallback
 *   3. Letterboxd Related Films (Tier A scraper, direct fetch) — cinephile taste
 *   4. Rotten Tomatoes Similar (Tier B scraper, ScrapingAnt) — critic consensus
 *   5. Metacritic Similar (Tier B scraper, ScrapingAnt) — score correlation
 *   6. AniList Recommendations (free API) — anime-specific
 *   7. Jikan/MAL Recommendations (free API) — anime-specific
 *
 * Merge strategy:
 *   - Each source returns movie titles (and sometimes TMDb IDs)
 *   - Movies without TMDb IDs are resolved via TMDb search
 *   - Deduplicate by TMDb ID
 *   - Score by number of sources recommending + source weight
 *   - Return top 8 with poster images
 */

import type { Movie } from '@/lib/types';
import * as TMDb from '@/lib/pipeline/clients/tmdb';
import { getRelatedFilms as getLetterboxdRelated } from '@/lib/pipeline/scrapers/letterboxd';
import { getSimilarMovies as getRTSimilar, searchMovie as searchRT } from '@/lib/pipeline/scrapers/rottentomatoes';
import * as AniList from '@/lib/pipeline/clients/anilist';
import * as Jikan from '@/lib/pipeline/clients/jikan';

// ─── Types ───────────────────────────────────────────────────────────────────

interface RecommendationEntry {
  movie: Movie;
  sources: string[];
  score: number;
}

// ─── Source Weights ──────────────────────────────────────────────────────────
// Higher weight = more influence on final ranking

const SOURCE_WEIGHTS: Record<string, number> = {
  tmdb_recommendations: 1.5,   // TMDb's curated recs are solid
  tmdb_similar: 1.2,          // Similar based on metadata
  letterboxd: 2.0,            // Cinephile taste — highest quality signal
  rottentomatoes: 1.3,        // Critic consensus driven
  anilist: 1.5,               // Anime community curated
  jikan: 1.3,                 // MAL community curated
};

// ─── Title-to-TMDb Resolver ─────────────────────────────────────────────────

const titleResolveCache = new Map<string, Movie | null>();

/**
 * Resolve a movie title (and optional year) to a TMDb Movie object.
 * Results are cached to avoid duplicate lookups.
 */
async function resolveTitleToTmdb(
  title: string,
  year?: number | null,
  mediaType: 'movie' | 'tv' = 'movie',
): Promise<Movie | null> {
  const cacheKey = `${title}:${year ?? 'any'}:${mediaType}`;

  if (titleResolveCache.has(cacheKey)) {
    return titleResolveCache.get(cacheKey) ?? null;
  }

  try {
    const results = await TMDb.searchMulti(title);
    if (!results || results.length === 0) {
      titleResolveCache.set(cacheKey, null);
      return null;
    }

    // Find best match — prefer matching year and media type
    let best: Movie | null = null;
    for (const result of results) {
      const resultYear = result.release_date?.split('-')[0];
      const resultType = result.media_type;

      // Skip if media type doesn't match
      if (mediaType === 'movie' && resultType === 'tv') continue;
      if (mediaType === 'tv' && resultType === 'movie') continue;

      // Skip if no poster
      if (!result.poster_path) continue;

      // Perfect match: same year + same type
      if (year && resultYear === String(year)) {
        best = result;
        break;
      }

      // Good enough: first result with poster
      if (!best) {
        best = result;
      }
    }

    titleResolveCache.set(cacheKey, best);
    return best;
  } catch {
    titleResolveCache.set(cacheKey, null);
    return null;
  }
}

// ─── Merge & Rank ────────────────────────────────────────────────────────────

function mergeAndRank(entries: Map<number, RecommendationEntry>): Movie[] {
  // Sort by composite score (source weight × number of sources)
  const sorted = [...entries.values()].sort((a, b) => b.score - a.score);

  // Return top 8 with poster images
  return sorted
    .filter((e) => e.movie.poster_path)
    .slice(0, 8)
    .map((e) => e.movie);
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Get multi-source movie recommendations.
 *
 * Strategy:
 *   Phase 1 (fast ~2-3s): TMDb recommendations + similar
 *   Phase 2 (enrichment ~5-15s): Letterboxd + RT + anime sources
 *
 * @param tmdbId - TMDb movie/TV ID
 * @param movieTitle - Movie title for scraper lookups
 * @param mediaType - 'movie' or 'tv' or 'anime'
 * @param enriched - If true, run all sources. If false, TMDb only.
 */
export async function getRecommendations(
  tmdbId: number,
  movieTitle?: string,
  mediaType: 'movie' | 'tv' | 'anime' = 'movie',
  enriched: boolean = true,
): Promise<{ recommendations: Movie[]; sources: string[] }> {
  const entries = new Map<number, RecommendationEntry>();
  const usedSources: string[] = [];

  // Helper to add a movie to the merge map
  function addEntry(movie: Movie, source: string) {
    const id = movie.tmdb_id || movie.id;
    const existing = entries.get(id);
    if (existing) {
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
        existing.score += SOURCE_WEIGHTS[source] ?? 1;
      }
    } else {
      entries.set(id, {
        movie,
        sources: [source],
        score: SOURCE_WEIGHTS[source] ?? 1,
      });
    }
  }

  // ── Phase 1: TMDb (fast, always runs) ──

  const isAnime = mediaType === 'anime';
  const isTv = mediaType === 'tv' || isAnime;

  // TMDb Recommendations
  try {
    if (isTv) {
      const similar = await TMDb.getSimilarTv(tmdbId);
      if (similar?.results) {
        for (const m of similar.results) addEntry(m, 'tmdb_similar');
        usedSources.push('TMDb Similar');
      }
    } else {
      const recs = await TMDb.getMovieRecommendations(tmdbId);
      if (recs?.results && recs.results.length > 0) {
        for (const m of recs.results) addEntry(m, 'tmdb_recommendations');
        usedSources.push('TMDb Recommendations');
      }

      // Also get similar as supplement
      const similar = await TMDb.getSimilarMovies(tmdbId);
      if (similar?.results) {
        for (const m of similar.results) addEntry(m, 'tmdb_similar');
        if (!usedSources.includes('TMDb Similar')) usedSources.push('TMDb Similar');
      }
    }
  } catch { /* TMDb failed, continue */ }

  // Return early if not enriched or if we already have enough
  if (!enriched || entries.size >= 8) {
    return {
      recommendations: mergeAndRank(entries),
      sources: usedSources,
    };
  }

  // ── Phase 2: Scraper + API Enrichment (parallel) ──

  const enrichmentPromises: Promise<void>[] = [];

  // Letterboxd Related Films (Tier A, free)
  if (movieTitle) {
    enrichmentPromises.push(
      (async () => {
        try {
          const result = await getLetterboxdRelated(movieTitle);
          if (result?.relatedFilms) {
            // Resolve Letterboxd titles to TMDb (in parallel, max 4)
            const resolvePromises = result.relatedFilms.slice(0, 6).map(async (film) => {
              const tmdbMovie = await resolveTitleToTmdb(film.title, film.year);
              if (tmdbMovie) addEntry(tmdbMovie, 'letterboxd');
            });
            await Promise.all(resolvePromises);
            usedSources.push('Letterboxd');
          }
        } catch { /* Letterboxd failed */ }
      })()
    );
  }

  // Rotten Tomatoes Similar (Tier B, ScrapingAnt)
  if (movieTitle) {
    enrichmentPromises.push(
      (async () => {
        try {
          // First find the RT slug for this movie
          const searchResults = await searchRT(movieTitle);
          if (searchResults && searchResults.length > 0) {
            const rtSlug = searchResults[0].slug;
            const similar = await getRTSimilar(rtSlug);
            if (similar && similar.length > 0) {
              const resolvePromises = similar.slice(0, 6).map(async (film) => {
                const tmdbMovie = await resolveTitleToTmdb(film.title, film.year);
                if (tmdbMovie) addEntry(tmdbMovie, 'rottentomatoes');
              });
              await Promise.all(resolvePromises);
              usedSources.push('Rotten Tomatoes');
            }
          }
        } catch { /* RT failed */ }
      })()
    );
  }

  // AniList Recommendations (free, for anime)
  if (isAnime) {
    enrichmentPromises.push(
      (async () => {
        try {
          // Get AniList ID from TMDb TV details
          const tvDetails = await TMDb.getTvDetails(tmdbId);
          if (tvDetails) {
            const anilistResult = await AniList.getAnimeByTmdbId(tmdbId);
            if (anilistResult) {
              const recs = await AniList.getRecommendations(anilistResult.anilistId);
              for (const rec of recs) {
                const displayTitle = rec.title.english || rec.title.romaji || '';
                if (!displayTitle) continue;
                const tmdbMovie = await resolveTitleToTmdb(displayTitle, null, 'tv');
                if (tmdbMovie) addEntry(tmdbMovie, 'anilist');
              }
              usedSources.push('AniList');
            }
          }
        } catch { /* AniList failed */ }
      })()
    );
  }

  // Jikan/MAL Recommendations (free, for anime)
  if (isAnime) {
    enrichmentPromises.push(
      (async () => {
        try {
          const anilistResult = await AniList.getAnimeByTmdbId(tmdbId);
          if (anilistResult?.malId) {
            const recs = await Jikan.getAnimeRecommendations(anilistResult.malId);
            for (const rec of recs.slice(0, 6)) {
              if (!rec.title) continue;
              const tmdbMovie = await resolveTitleToTmdb(rec.title, null, 'tv');
              if (tmdbMovie) addEntry(tmdbMovie, 'jikan');
            }
            usedSources.push('Jikan/MAL');
          }
        } catch { /* Jikan failed */ }
      })()
    );
  }

  // Run all enrichment in parallel with a timeout
  await Promise.allSettled(
    enrichmentPromises.map(p =>
      Promise.race([
        p,
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('Enrichment timeout')), 15_000)
        ),
      ])
    )
  );

  return {
    recommendations: mergeAndRank(entries),
    sources: usedSources,
  };
}
