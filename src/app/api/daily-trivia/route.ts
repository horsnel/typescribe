import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCurrentProfile, recordGameResult, unlockAchievement } from '@/lib/db';

/**
 * GET /api/daily-trivia
 * Returns today's trivia question. Auto-creates one if missing.
 *
 * POST /api/daily-trivia
 *   body: { date, answer_idx }
 * Scores the answer.
 */

const QUESTIONS = [
  {
    movie_id: 278,
    movie_title: 'The Shawshank Redemption',
    question: 'In The Shawshank Redemption, what is Andy Dufresne\'s profession before being imprisoned?',
    choices: ['Banker', 'Lawyer', 'Doctor', 'Architect'],
    answer_idx: 0,
    explanation: 'Andy was a banker — which made him invaluable to the warden.',
  },
  {
    movie_id: 238,
    movie_title: 'The Godfather',
    question: 'In The Godfather, what fruit appears throughout the film as a foreshadowing of death?',
    choices: ['Apples', 'Oranges', 'Grapes', 'Lemons'],
    answer_idx: 1,
    explanation: 'Oranges appear in scenes where a character is about to die or face tragedy.',
  },
  {
    movie_id: 680,
    movie_title: 'Pulp Fiction',
    question: 'In Pulp Fiction, what is the name of the diner where Pumpkin and Honey Bunny attempt a robbery?',
    choices: ['Big Ed\'s', 'Hawthorne Grill', 'Jackrabbit Slim\'s', 'Mona Lisa'],
    answer_idx: 1,
    explanation: 'The Hawthorne Grill is the opening and closing diner.',
  },
  {
    movie_id: 603,
    movie_title: 'The Matrix',
    question: 'In The Matrix, what color pill does Neo take?',
    choices: ['Blue', 'Green', 'Red', 'Yellow'],
    answer_idx: 2,
    explanation: 'The red pill awakens Neo to the real world.',
  },
  {
    movie_id: 11,
    movie_title: 'Star Wars',
    question: 'In the original Star Wars, who is Luke\'s aunt?',
    choices: ['Beru', 'Padmé', 'Breha', 'Mon Mothma'],
    answer_idx: 0,
    explanation: 'Aunt Beru Lars raises Luke on Tatooine.',
  },
  {
    movie_id: 129,
    movie_title: 'Spirited Away',
    question: 'In Spirited Away, what is the name of the bathhouse owner?',
    choices: ['Yubaba', 'Zeniba', 'Kamaji', 'Lin'],
    answer_idx: 0,
    explanation: 'Yubaba is the witch who runs the bathhouse.',
  },
  {
    movie_id: 155,
    movie_title: 'The Dark Knight',
    question: 'In The Dark Knight, what is the Joker\'s signature line about why he uses a knife?',
    choices: ['"Guns are too quick."', '"Knives are personal."', '"Knives are cheaper."', '"Guns are too loud."'],
    answer_idx: 1,
    explanation: 'The Joker prefers knives because they are personal.',
  },
];

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: existing } = await supabaseAdmin
    .from('daily_trivia')
    .select('*')
    .eq('trivia_date', today)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      date: existing.trivia_date,
      movie_id: existing.movie_id,
      question: existing.question,
      choices: existing.choices,
      // Don't leak the answer
    });
  }

  // Pick a deterministic question for today
  const seed = today.split('-').map(Number).reduce((a, b) => a + b * 31, 0);
  const q = QUESTIONS[seed % QUESTIONS.length];

  const { data, error } = await supabaseAdmin
    .from('daily_trivia')
    .insert({
      trivia_date: today,
      movie_id: q.movie_id,
      question: q.question,
      choices: q.choices,
      answer_idx: q.answer_idx,
      explanation: q.explanation,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    date: data.trivia_date,
    movie_id: data.movie_id,
    question: data.question,
    choices: data.choices,
  });
}

export async function POST(req: NextRequest) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { answer_idx } = await req.json();
  const today = new Date().toISOString().slice(0, 10);

  const { data: trivia } = await supabaseAdmin
    .from('daily_trivia')
    .select('*')
    .eq('trivia_date', today)
    .maybeSingle();

  if (!trivia) return NextResponse.json({ error: 'No trivia for today' }, { status: 404 });

  const correct = answer_idx === trivia.answer_idx;
  const score = correct ? 100 : 0;

  await recordGameResult(profile.id, 'trivia', score, {
    date: today,
    answer: answer_idx,
    correct,
    correct_idx: trivia.answer_idx,
  });

  if (correct) await unlockAchievement(profile.id, 'grid_first'); // reuse for trivia

  return NextResponse.json({
    correct,
    correct_idx: trivia.answer_idx,
    explanation: trivia.explanation,
    score,
  });
}
