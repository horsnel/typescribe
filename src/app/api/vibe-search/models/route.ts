import { NextResponse } from 'next/server';

/**
 * GET /api/vibe-search/models
 * Diagnostic endpoint — lists all Gemini models available for the configured key.
 * Used to figure out which embedding model name to use.
 */
export async function GET() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      { headers: { 'Content-Type': 'application/json' } },
    );
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? data, status: res.status }, { status: res.status });
    }
    const embeddingModels = (data.models ?? [])
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        (m.supportedGenerationMethods ?? []).includes('embedContent'))
      .map((m: { name: string; description?: string; supportedGenerationMethods?: string[] }) => ({
        name: m.name,
        description: m.description,
        methods: m.supportedGenerationMethods,
      }));
    return NextResponse.json({ embedding_models: embeddingModels, total: embeddingModels.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
