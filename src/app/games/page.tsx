import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Games — Typescribe',
  description: 'Daily movie games: Immaculate Grid, Six Degrees, and Daily Trivia.',
};

const GAMES = [
  {
    slug: 'grid',
    title: 'Immaculate Grid',
    emoji: '9',
    blurb: 'Pick a movie that fits each decade × genre cell. Nine cells, nine movies, one daily puzzle.',
    href: '/games/grid',
    accent: 'from-amber-500/20 to-orange-600/10 border-amber-500/40',
  },
  {
    slug: 'trivia',
    title: 'Daily Trivia',
    emoji: '?',
    blurb: 'A new movie question every day. Test your film knowledge and build a streak.',
    href: '/games/trivia',
    accent: 'from-sky-500/20 to-blue-600/10 border-sky-500/40',
  },
  {
    slug: 'six-degrees',
    title: 'Six Degrees',
    emoji: '6',
    blurb: 'Connect any two actors through shared films in as few hops as possible.',
    href: '/games/six-degrees',
    accent: 'from-fuchsia-500/20 to-purple-600/10 border-fuchsia-500/40',
  },
];

export default function GamesHubPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4A853] mb-3">Play</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Movie Games</h1>
          <p className="text-[#9ca3af] mt-4 max-w-2xl">
            Three daily games built from your watch history and the global Typescribe catalog.
            Earn achievements, build streaks, and compete with friends.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {GAMES.map((g) => (
            <Link
              key={g.slug}
              href={g.href}
              className={`group relative rounded-2xl border bg-gradient-to-br ${g.accent} p-8 hover:scale-[1.02] transition-transform`}
            >
              <div className="text-5xl mb-6 font-bold text-white/90">{g.emoji}</div>
              <h2 className="text-2xl font-semibold mb-2">{g.title}</h2>
              <p className="text-sm text-[#9ca3af] leading-relaxed">{g.blurb}</p>
              <div className="mt-6 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm font-medium text-[#D4A853] group-hover:bg-[#D4A853] group-hover:text-black group-hover:gap-2.5 transition-all">
                Play now <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-[#9ca3af]">
          <div>
            <h3 className="text-white font-semibold mb-2">How scoring works</h3>
            <p className="leading-relaxed">
              Each game awards points based on accuracy and speed. Daily streaks multiply your score,
              and rare wins unlock achievements visible on your profile.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">New puzzles every day</h3>
            <p className="leading-relaxed">
              Grids, trivia, and actor pairs refresh at midnight UTC. Come back daily to keep your
              streak alive and climb the global leaderboard.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
