import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/cinema-atlas
 * F39 — Global Cinema Atlas. Returns curated films grouped by country
 * for the interactive world-map view.
 */

// Curated seed list — would normally come from movie_embeddings or a country_codes table
const COUNTRY_FILMS: Record<string, { id: number; title: string; poster: string; year: number }[]> = {
  JP: [
    { id: 129, title: 'Spirited Away', poster: '/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg', year: 2001 },
    { id: 517, title: 'Princess Mononoke', poster: '/jHWmNr7m544fJ8eItsfNk8fs2Ed.jpg', year: 1997 },
  ],
  KR: [
    { id: 496243, title: 'Parasite', poster: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg', year: 2019 },
    { id: 634649, title: 'Dune', poster: '/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', year: 2021 },
  ],
  IN: [
    { id: 10486, title: '3 Idiots', poster: '/66A9MqXOyVFCssoloscw79z8Tew.jpg', year: 2009 },
  ],
  FR: [
    { id: 10530, title: 'Amélie', poster: '/f0uorE7K7BicD1tPbsiMgZSK8LR.jpg', year: 2001 },
  ],
  IT: [
    { id: 1124, title: 'The Good, the Bad and the Ugly', poster: '/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg', year: 1966 },
  ],
  DE: [
    { id: 58, title: 'Metropolis', poster: '/hUK9rewffKGqtXynH5SW3v9hzcu.jpg', year: 1927 },
  ],
  ES: [
    { id: 5957, title: "Pan's Labyrinth", poster: '/4kJoFbBLuoYczAUJZj8CjV3Ppi8.jpg', year: 2006 },
  ],
  SE: [
    { id: 8587, title: 'The Girl with the Dragon Tattoo', poster: '/4uHp2XNXk6mKQA5D2dDxReNVc1N.jpg', year: 2009 },
  ],
  CN: [
    { id: 12974, title: 'Hero', poster: '/9b3F2MNQR4kfhZNm3Y2vN4CpfgT.jpg', year: 2002 },
  ],
  HK: [
    { id: 13385, title: 'In the Mood for Love', poster: '/iYypPT4bhqXfn1c6Sze4tQDoxa6.jpg', year: 2000 },
  ],
  IR: [
    { id: 84103, title: 'A Separation', poster: '/lJloTOheuQSirSLXNA3JHsrMNfH.jpg', year: 2011 },
  ],
  BR: [
    { id: 120467, title: 'City of God', poster: '/k7eYdcZ8oqp8XW9WjnergSAzDjh.jpg', year: 2002 },
  ],
  MX: [
    { id: 308266, title: 'Roma', poster: '/wVUdHOywG3WWWg8sHC7JX7Ofhee.jpg', year: 2018 },
  ],
  AR: [
    { id: 35711, title: 'The Secret in Their Eyes', poster: '/j4ya8sR9Q7eFWHrZei7yQyN1KwO.jpg', year: 2009 },
  ],
  NG: [
    { id: 2660, title: 'Half of a Yellow Sun', poster: '/a8f5Z2NqTp1r3D9Y8K3bX2Y0w1r.jpg', year: 2013 },
  ],
  GB: [
    { id: 769, title: 'Trainspotting', poster: '/euQHnaQ7QXs11Snzx8SBpoJsLYG.jpg', year: 1996 },
  ],
  US: [
    { id: 278, title: 'The Shawshank Redemption', poster: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg', year: 1994 },
    { id: 238, title: 'The Godfather', poster: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg', year: 1972 },
  ],
};

const COUNTRY_NAMES: Record<string, string> = {
  JP: 'Japan', KR: 'South Korea', IN: 'India', FR: 'France', IT: 'Italy', DE: 'Germany',
  ES: 'Spain', SE: 'Sweden', CN: 'China', HK: 'Hong Kong', IR: 'Iran', BR: 'Brazil',
  MX: 'Mexico', AR: 'Argentina', NG: 'Nigeria', GB: 'United Kingdom', US: 'United States',
};

export async function GET() {
  const countries = Object.entries(COUNTRY_FILMS).map(([code, films]) => ({
    code,
    name: COUNTRY_NAMES[code] ?? code,
    flag: `https://flagcdn.com/w80/${code.toLowerCase()}.png`,
    filmCount: films.length,
    films: films.map(f => ({
      ...f,
      poster_url: `https://image.tmdb.org/t/p/w300${f.poster}`,
    })),
  }));

  return NextResponse.json({ countries });
}
