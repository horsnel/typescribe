/**
 * GET /api/communities
 * POST /api/communities
 */
import { NextRequest, NextResponse } from 'next/server';

const MOCK_COMMUNITIES = [
  {
    id: 'horror-fans',
    name: 'Horror Fans',
    description: 'For lovers of horror and thriller films. Discuss the scariest movies and share recommendations.',
    type: 'Genre',
    members: 1240,
    posts: 340,
    rules: ['Be respectful to all members', 'No spoilers without tags', 'Stay on topic — horror films only', 'No spam or self-promotion'],
    createdAt: '2024-06-15T00:00:00Z',
    creatorId: 201,
    creatorName: 'FilmBuff42',
  },
  {
    id: 'k-drama-club',
    name: 'K-Drama Club',
    description: 'Korean drama discussions, episode reviews, and recommendations for all K-drama fans.',
    type: 'Country',
    members: 3420,
    posts: 890,
    rules: ['Use spoiler tags for recent episodes', 'Recommendations welcome', 'Be kind to fellow drama fans', 'English preferred but Korean OK'],
    createdAt: '2024-03-22T00:00:00Z',
    creatorId: 204,
    creatorName: 'DramaQueen',
  },
  {
    id: 'nollywood-watchers',
    name: 'Nollywood Watchers',
    description: 'Celebrating Nigerian cinema, Nollywood classics, and the new wave of African filmmaking.',
    type: 'Country',
    members: 890,
    posts: 210,
    rules: ['Celebrate African cinema', 'Share local recommendations', 'No piracy links'],
    createdAt: '2024-08-10T00:00:00Z',
    creatorId: 201,
    creatorName: 'FilmBuff42',
  },
  {
    id: 'nolan-fans',
    name: 'Christopher Nolan Fans',
    description: "Deep dives into Nolan's filmography, filmmaking techniques, and upcoming projects.",
    type: 'Creator',
    members: 2100,
    posts: 560,
    rules: ['Nolan-focused discussions', 'Behind-the-scenes content welcome', 'Theory discussions encouraged'],
    createdAt: '2024-01-05T00:00:00Z',
    creatorId: 208,
    creatorName: 'Nolanite',
  },
  {
    id: 'anime-explorers',
    name: 'Anime Explorers',
    description: 'Anime recommendations, seasonal discussions, and reviews from casual to hardcore fans.',
    type: 'Theme',
    members: 5600,
    posts: 1200,
    rules: ['Tag spoilers for recent episodes', 'Recommendations need context', 'No elitism — all anime fans welcome', 'Seasonal discussion threads pinned'],
    createdAt: '2023-11-20T00:00:00Z',
    creatorId: 206,
    creatorName: 'OtakuPrime',
  },
  {
    id: 'classic-cinema',
    name: 'Classic Cinema',
    description: 'Pre-1970s cinema appreciation, restoration news, and deep cuts from the golden age.',
    type: 'Theme',
    members: 780,
    posts: 180,
    rules: ['Focus on films before 1970s', 'Restoration and preservation news welcome', 'Share where to find classics'],
    createdAt: '2024-05-01T00:00:00Z',
    creatorId: 203,
    creatorName: 'CinePhreak',
  },
  {
    id: 'scifi-universe',
    name: 'Sci-Fi Universe',
    description: 'From Blade Runner to Dune — exploring science fiction in film and television.',
    type: 'Genre',
    members: 2800,
    posts: 670,
    rules: ['Sci-fi films and series only', 'Book vs movie comparisons welcome', 'No spoilers in titles'],
    createdAt: '2024-02-14T00:00:00Z',
    creatorId: 209,
    creatorName: 'SpaceNerd',
  },
  {
    id: 'indie-film-lovers',
    name: 'Indie Film Lovers',
    description: 'Independent cinema, film festival coverage, and hidden gem recommendations.',
    type: 'Theme',
    members: 950,
    posts: 290,
    rules: ['Indie and art house focus', 'Festival coverage encouraged', 'Support indie filmmakers'],
    createdAt: '2024-07-18T00:00:00Z',
    creatorId: 210,
    creatorName: 'IndieLover',
  },
  {
    id: 'bollywood-beats',
    name: 'Bollywood Beats',
    description: 'Bollywood movie discussions, music, and the latest releases from Indian cinema.',
    type: 'Country',
    members: 1650,
    posts: 420,
    rules: ['Bollywood and Indian cinema focus', 'Music discussions welcome', 'Hindi and English OK'],
    createdAt: '2024-04-30T00:00:00Z',
    creatorId: 201,
    creatorName: 'FilmBuff42',
  },
  {
    id: 'documentary-circle',
    name: 'Documentary Circle',
    description: 'True crime, nature, social issues — documentary fans unite.',
    type: 'Genre',
    members: 620,
    posts: 150,
    rules: ['Documentary focus', 'Source credibility matters', 'No conspiracy theories'],
    createdAt: '2024-09-05T00:00:00Z',
    creatorId: 203,
    creatorName: 'CinePhreak',
  },
  {
    id: 'romance-fans',
    name: 'Romance Readers & Watchers',
    description: 'For those who love a good love story — books and films alike.',
    type: 'Genre',
    members: 1100,
    posts: 310,
    rules: ['Romance genre focus', 'Book-to-film discussions welcome', 'Be supportive of all tastes'],
    createdAt: '2024-06-22T00:00:00Z',
    creatorId: 205,
    creatorName: 'SeoulSister',
  },
  {
    id: 'a24-appreciation',
    name: 'A24 Appreciation',
    description: 'Everything A24 — from Moonlight to Everything Everywhere All at Once.',
    type: 'Creator',
    members: 3400,
    posts: 890,
    rules: ['A24 productions and distributors only', 'Deep dives and analysis encouraged', 'No studio wars'],
    createdAt: '2024-01-15T00:00:00Z',
    creatorId: 210,
    creatorName: 'IndieLover',
  },
];

const MOCK_POSTS: Record<string, Array<{
  id: string;
  title: string;
  author: string;
  authorId: number;
  authorAvatar: string;
  content: string;
  replyCount: number;
  upvoteCount: number;
  createdAt: string;
}>> = {
  'horror-fans': [
    { id: 'p1', title: 'What horror movie genuinely scared you the most?', author: 'FilmBuff42', authorId: 201, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', content: 'I watched The Silent Dwelling last night and could not sleep. What movie genuinely terrified you?', replyCount: 45, upvoteCount: 89, createdAt: '2025-12-01T14:30:00Z' },
    { id: 'p2', title: 'Best horror directors of the 2020s?', author: 'HorrorHound', authorId: 202, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Buster', content: 'Looking for recommendations from the best horror directors working today. My picks: Ari Aster, Jordan Peele, and L. Petrov.', replyCount: 32, upvoteCount: 67, createdAt: '2025-11-28T09:15:00Z' },
    { id: 'p3', title: 'The evolution of haunted house films', author: 'CinePhreak', authorId: 203, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Duke', content: 'From The Haunting to The Silent Dwelling — how the haunted house subgenre has evolved over the decades.', replyCount: 18, upvoteCount: 45, createdAt: '2025-11-25T16:45:00Z' },
  ],
  'k-drama-club': [
    { id: 'p4', title: 'Best K-dramas of 2025 so far?', author: 'DramaQueen', authorId: 204, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', content: 'We are halfway through the year. What are your top picks for K-dramas in 2025?', replyCount: 56, upvoteCount: 102, createdAt: '2025-12-02T08:00:00Z' },
    { id: 'p5', title: 'Unpopular opinion: slow-burn romances are overrated', author: 'SeoulSister', authorId: 205, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna', content: 'I said what I said. Give me fast-paced, plot-driven dramas any day over 16 episodes of will-they-won\'t-they.', replyCount: 89, upvoteCount: 34, createdAt: '2025-11-30T12:30:00Z' },
  ],
  'anime-explorers': [
    { id: 'p6', title: 'Winter 2026 anime season preview', author: 'OtakuPrime', authorId: 206, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper', content: 'The winter season lineup looks incredible. Neon Ronin season 2 confirmed! What are you most excited about?', replyCount: 120, upvoteCount: 234, createdAt: '2025-12-03T10:00:00Z' },
    { id: 'p7', title: 'Underrated anime that deserve more attention', author: 'MangaFan99', authorId: 207, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight', content: 'Skip the mainstream hits — what anime do you think flew under the radar but absolutely slaps?', replyCount: 78, upvoteCount: 156, createdAt: '2025-12-01T15:20:00Z' },
  ],
  'nolan-fans': [
    { id: 'p8', title: 'Ranking every Nolan film from worst to best', author: 'Nolanite', authorId: 208, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow', content: 'Hot take incoming: The Prestige is his best film, not Inception. Fight me.', replyCount: 67, upvoteCount: 89, createdAt: '2025-11-29T18:00:00Z' },
  ],
  'scifi-universe': [
    { id: 'p9', title: 'Cosmic Drift vs. Aurora Rising — which sci-fi did it better?', author: 'SpaceNerd', authorId: 209, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba', content: 'Both films tackle isolation in space, but with very different approaches. Which one resonated more with you?', replyCount: 41, upvoteCount: 73, createdAt: '2025-12-02T14:00:00Z' },
    { id: 'p10', title: 'The best practical effects in sci-fi history', author: 'RetroScifi', authorId: 209, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Simba', content: 'From 2001: A Space Odyssey to Blade Runner 2049 — celebrating the practical effects that make sci-fi magical.', replyCount: 29, upvoteCount: 58, createdAt: '2025-11-27T11:30:00Z' },
  ],
  'a24-appreciation': [
    { id: 'p11', title: 'A24 films that changed cinema', author: 'IndieLover', authorId: 210, authorAvatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zoe', content: 'From Moonlight to Everything Everywhere — discussing the A24 films that had a lasting cultural impact.', replyCount: 53, upvoteCount: 112, createdAt: '2025-12-01T09:00:00Z' },
  ],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const communityId = searchParams.get('id');

    if (communityId) {
      const community = MOCK_COMMUNITIES.find(c => c.id === communityId);
      if (!community) {
        return NextResponse.json({ error: 'Community not found' }, { status: 404 });
      }
      const posts = MOCK_POSTS[communityId] || [];
      return NextResponse.json({ community, posts });
    }

    return NextResponse.json({ communities: MOCK_COMMUNITIES });
  } catch (error: any) {
    console.error('[API /communities] GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch communities' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type, creatorId, creatorName } = body;

    if (!name || !description) {
      return NextResponse.json({ error: 'Name and description are required' }, { status: 400 });
    }

    const newCommunity = {
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      name,
      description,
      type: type || 'Theme',
      members: 1,
      posts: 0,
      rules: ['Be respectful', 'Stay on topic', 'No spam'],
      createdAt: new Date().toISOString(),
      creatorId: creatorId || 0,
      creatorName: creatorName || 'Anonymous',
    };

    return NextResponse.json({ community: newCommunity }, { status: 201 });
  } catch (error: any) {
    console.error('[API /communities] POST Error:', error);
    return NextResponse.json({ error: 'Failed to create community' }, { status: 500 });
  }
}
