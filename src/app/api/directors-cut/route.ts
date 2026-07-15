import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/directors-cut
 * Body: { movieId, movieTitle, question }
 *
 * Gemini-powered Q&A about a specific film. Caches responses in
 * ai_content_cache for 7 days.
 */

export async function POST(req: NextRequest) {
  const { movieId, movieTitle, question } = await req.json();
  if (!movieId || !movieTitle || !question) {
    return NextResponse.json({ error: 'movieId, movieTitle, question required' }, { status: 400 });
  }

  const cacheKey = `directors-cut:${movieId}:${question.slice(0, 100)}`;
  const { data: cached } = await supabaseAdmin
    .from('ai_content_cache')
    .select('content')
    .eq('cache_key', cacheKey)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ answer: cached.content.answer, source: 'cache' });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({
      answer: `**Director's Cut** requires Gemini AI to be configured. Set GEMINI_API_KEY in your environment to enable deep film analysis.

For *${movieTitle}*, here's what I'd explore based on your question: "${question}"

This is a placeholder response. With Gemini enabled, you'd get a detailed analysis covering themes, cinematography choices, character motivations, and directorial intent.`,
      source: 'fallback',
    });
  }

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const prompt = `You are a film scholar hosting "Director's Cut" — a deep-dive Q&A about cinema. Answer the user's question about the movie "${movieTitle}" with insight, craft, and brevity (under 250 words). Touch on themes, cinematography, character, or directorial choices where relevant. Be specific, not generic.

Question: ${question}`;

    const r = await model.generateContent(prompt);
    const answer = r.response.text();

    await supabaseAdmin.from('ai_content_cache').upsert({
      cache_key: cacheKey,
      content: { answer },
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    }, { onConflict: 'cache_key' });

    return NextResponse.json({ answer, source: 'gemini' });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
