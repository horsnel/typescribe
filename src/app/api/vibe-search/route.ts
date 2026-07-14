import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * GET /api/vibe-search?q=...
 * Returns movies whose pgvector embedding is closest (cosine) to the
 * embedding of the user's natural-language query.
 *
 * POST /api/vibe-search/seed  — seeds embeddings for popular movies
 */

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const r = await model.embedContent(text);
    return r.embedding.values;
  } catch (e) {
    console.error('Embed failed:', e);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

  const vec = await embed(q);
  if (!vec) {
    // No API key — return a fuzzy-text fallback
    const { data } = await supabaseAdmin
      .from('movie_embeddings')
      .select('movie_id, movie_title, poster_path, overview, genres')
      .or(`movie_title.ilike.%${q}%,overview.ilike.%${q}%`)
      .limit(20);
    return NextResponse.json({ results: data ?? [], source: 'fallback' });
  }

  // pgvector cosine similarity via RPC
  const { data, error } = await supabaseAdmin.rpc('match_movies', {
    query_embedding: vec,
    match_count: 20,
  });
  if (error) {
    console.error('match_movies RPC failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ results: data ?? [], source: 'pgvector' });
}
