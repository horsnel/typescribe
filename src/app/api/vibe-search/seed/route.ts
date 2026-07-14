import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * POST /api/vibe-search/seed
 * Builds embeddings for the curated pool of popular movies and inserts
 * them into movie_embeddings.
 */

const POOL = [
  { id: 278, title: 'The Shawshank Redemption', overview: 'Two imprisoned men bond over years, finding solace and eventual redemption through acts of common decency.', genres: ['Drama','Crime'], poster: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', date: '1994-09-23' },
  { id: 238, title: 'The Godfather', overview: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.', genres: ['Crime','Drama'], poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', date: '1972-03-14' },
  { id: 240, title: 'The Godfather Part II', overview: 'The early life and career of Vito Corleone in 1920s New York is portrayed while his son, Michael, expands and tightens his grip on the family crime syndicate.', genres: ['Crime','Drama'], poster: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg', date: '1974-12-20' },
  { id: 424, title: "Schindler's List", overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis while they worked as slaves in his factory.', genres: ['Drama','History','War'], poster: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg', date: '1993-12-15' },
  { id: 389, title: '12 Angry Men', overview: 'A jury holdout attempts to prevent a miscarriage of justice by forcing his colleagues to reconsider the evidence.', genres: ['Drama'], poster: '/ow3wq89wM8qd5X7W5d0XQa6qo6r.jpg', date: '1957-04-10' },
  { id: 129, title: 'Spirited Away', overview: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits.', genres: ['Animation','Family','Fantasy'], poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', date: '2001-07-20' },
  { id: 497, title: 'The Green Mile', overview: 'The lives of guards on death row are affected by one of their charges: a black man accused of child murder and rape, yet who has a mysterious gift.', genres: ['Fantasy','Drama','Crime'], poster: '/velWPhVMQeQKcxggNuVeNm7v8Z3.jpg', date: '1999-12-10' },
  { id: 680, title: 'Pulp Fiction', overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.', genres: ['Thriller','Crime'], poster: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg', date: '1994-09-10' },
  { id: 155, title: 'The Dark Knight', overview: 'Batman raises the stakes in his war on crime. With the help of Lt. Jim Gordon and District Attorney Harvey Dent, Batman sets out to dismantle the remaining criminal organizations.', genres: ['Action','Crime','Drama','Thriller'], poster: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg', date: '2008-07-18' },
  { id: 496243, title: 'Parasite', overview: 'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.', genres: ['Comedy','Thriller','Drama'], poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', date: '2019-05-30' },
  { id: 13, title: 'Forrest Gump', overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events.', genres: ['Comedy','Drama','Romance'], poster: '/arw2vcBveWOVZr6pxd9XTd1TdQa.jpg', date: '1994-07-06' },
  { id: 27205, title: 'Inception', overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.', genres: ['Action','Science Fiction','Thriller'], poster: '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg', date: '2010-07-15' },
  { id: 157336, title: 'Interstellar', overview: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.', genres: ['Adventure','Drama','Science Fiction'], poster: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg', date: '2014-11-05' },
  { id: 603, title: 'The Matrix', overview: 'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.', genres: ['Action','Science Fiction'], poster: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', date: '1999-03-30' },
  { id: 510, title: 'One Flew Over the Cuckoo\'s Nest', overview: 'While serving time for insanity at a state mental hospital, implacable rabble-rouser, Randle Patrick McMurphy, inspires his fellow patients to rebel against the authoritarian rule of head nurse, Mildred Ratched.', genres: ['Drama'], poster: '/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg', date: '1975-11-19' },
  { id: 11, title: 'Star Wars', overview: 'Princess Leia is captured and held hostage by the evil Imperial forces. Luke Skywalker and Han Solo work together to rescue her.', genres: ['Adventure','Action','Science Fiction'], poster: '/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg', date: '1977-05-25' },
  { id: 769, title: 'GoodFellas', overview: 'The true story of Henry Hill, a half-Irish, half-Sicilian Brooklyn kid who is adopted by neighbourhood gangsters at an early age.', genres: ['Drama','Crime'], poster: '/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg', date: '1990-09-12' },
  { id: 539, title: 'Psycho', overview: 'A Phoenix secretary embezzles $40,000 from her employer\'s client, goes on the run, and checks into a remote motel run by a young man under the domination of his mother.', genres: ['Horror','Thriller'], poster: '/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg', date: '1960-06-22' },
];

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
  }
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

  const body = await req.json().catch(() => ({}));
  const movies = body.movies ?? POOL;

  let ok = 0, fail = 0;
  const errors: string[] = [];
  for (const m of movies) {
    try {
      const text = `${m.title}. ${m.overview ?? ''} Genres: ${(m.genres ?? []).join(', ')}.`;
      const r = await model.embedContent(text);
      const vec = r.embedding.values;
      const { error: upsertErr } = await supabaseAdmin.from('movie_embeddings').upsert({
        movie_id: m.id,
        movie_title: m.title,
        poster_path: m.poster,
        overview: m.overview,
        release_date: m.date,
        genres: m.genres,
        embedding: vec,
        metadata: { source: 'seed' },
      }, { onConflict: 'movie_id' });
      if (upsertErr) throw new Error(`Upsert failed: ${upsertErr.message}`);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Embed failed for ${m.id} (${m.title}):`, msg);
      if (errors.length < 3) errors.push(`movie_id=${m.id} (${m.title}): ${msg}`);
      fail++;
    }
  }
  return NextResponse.json({
    ok, fail, total: movies.length,
    ...(errors.length ? { sample_errors: errors } : {}),
    key_present: !!key,
    key_prefix: key.slice(0, 8),
  });
}
