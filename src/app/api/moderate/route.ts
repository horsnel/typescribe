import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/moderate
 * Body: { text: string, rating?: number }
 *
 * Returns: { flagged, reason, severity, confidence, autoAction, source }
 *
 * - If GEMINI_API_KEY is set, uses Gemini Pro for content classification.
 * - Otherwise, falls back to the same rule-based filter as the client.
 *
 * Use this BEFORE persisting user-generated content (reviews, comments, posts).
 */

const RULES: { pattern: RegExp; reason: string; severity: 'low'|'medium'|'high'; label: string }[] = [
  { pattern: /\b(kill\s+yourself|kys|go\s+die)\b/i, reason:'harassment', severity:'high', label:'Harassment / self-harm language' },
  { pattern: /\b(you\s*'\s*re\s+stupid|you\s+suck|loser+)\b/i, reason:'harassment', severity:'medium', label:'Personal attack' },
  { pattern: /(.)\1{10,}/, reason:'spam', severity:'low', label:'Spam-like repeated characters' },
  { pattern: /\b(buy\s+now|click\s+here|free\s+money)\b/i, reason:'spam', severity:'high', label:'Spam / promotional' },
  { pattern: /\b(dies?\s+at\s+the\s+end|the\s+killer\s+is)\b/i, reason:'spoiler', severity:'medium', label:'Unmarked spoiler' },
];

function ruleBasedModerate(text: string) {
  for (const r of RULES) {
    if (r.pattern.test(text)) {
      return {
        flagged: true,
        reason: r.label,
        severity: r.severity,
        confidence: r.severity === 'high' ? 0.9 : r.severity === 'medium' ? 0.7 : 0.5,
        autoAction: r.severity === 'high' ? 'reject' : r.severity === 'medium' ? 'hold' : 'warn',
        source: 'rule-based',
      };
    }
  }
  return {
    flagged: false,
    severity: 'none' as const,
    confidence: 1,
    source: 'rule-based',
  };
}

async function geminiModerate(text: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Classify this user content. Reply ONLY with JSON: {"flagged":boolean,"severity":"none|low|medium|high","reason":"short label if flagged","confidence":0.0-1.0}

Categories to detect: harassment, hate_speech, spam, spoiler, low_quality, none.

Content: """${text.slice(0, 4000)}"""`;
    const r = await model.generateContent(prompt);
    const txt = r.response.text().trim();
    const json = JSON.parse(txt.replace(/^```json|```$/g, '').trim());
    return {
      flagged: !!json.flagged,
      reason: json.reason ?? '',
      severity: json.severity ?? 'none',
      confidence: Number(json.confidence ?? 0.8),
      autoAction: json.severity === 'high' ? 'reject' : json.severity === 'medium' ? 'hold' : json.severity === 'low' ? 'warn' : undefined,
      source: 'gemini',
    };
  } catch (e) {
    console.error('Gemini moderation failed, falling back to rules:', e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { text, rating } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    // Try Gemini first (server-side, real AI)
    const ai = await geminiModerate(text);
    if (ai) {
      return NextResponse.json({ ...ai, rating });
    }

    // Fallback to deterministic rules
    return NextResponse.json({ ...ruleBasedModerate(text), rating });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
