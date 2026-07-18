import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover — Typescribe',
  description: 'AI-powered discovery tools: vibe search, mood heatmap, personality, wrapped, directors cut, and the monthly film festival.',
};

const FEATURES = [
  {
    title: 'Vibe Search',
    href: '/vibe',
    tag: 'Semantic',
    blurb: 'Search movies by feeling — "rainy Sunday melancholy", "adrenaline-fueled chase", "cozy autumn romance". Semantic matching finds films that fit the mood.',
    accent: 'border-amber-500/40 from-amber-500/15 to-transparent',
  },
  {
    title: 'Movie Personality',
    href: '/personality',
    tag: 'Profile',
    blurb: 'A 12-archetype personality profile computed from your reviews and watch diary. Find your taste twin and see how you compare to friends.',
    accent: 'border-rose-500/40 from-rose-500/15 to-transparent',
  },
  {
    title: "Director's Cut",
    href: '/directors-cut',
    tag: 'AI Q&A',
    blurb: 'Ask anything about a film and get an in-universe answer from the director\'s perspective.',
    accent: 'border-violet-500/40 from-violet-500/15 to-transparent',
  },
  {
    title: 'Mood Heatmap',
    href: '/mood',
    tag: 'Visualization',
    blurb: 'See which moods dominate your watch history across 10 emotional dimensions, with intensity visualization per mood.',
    accent: 'border-sky-500/40 from-sky-500/15 to-transparent',
  },
  {
    title: 'Global Cinema Atlas',
    href: '/atlas',
    tag: 'World',
    blurb: 'Curated films from 17 countries — Japan, Korea, India, France, Iran, Brazil, Mexico and more. Explore world cinema by region.',
    accent: 'border-emerald-500/40 from-emerald-500/15 to-transparent',
  },
  {
    title: 'Monthly Film Festival',
    href: '/festival',
    tag: 'Free',
    blurb: 'A new curated selection of free, public-domain films every month. 28-31 films picked deterministically per month.',
    accent: 'border-orange-500/40 from-orange-500/15 to-transparent',
  },
  {
    title: 'Your Wrapped',
    href: '/wrapped',
    tag: 'Yearly',
    blurb: 'A Spotify-Wrapped-style annual review of your watch history — top genres, most-watched directors, longest streaks, and more.',
    accent: 'border-fuchsia-500/40 from-fuchsia-500/15 to-transparent',
  },
  {
    title: 'Watch Parties',
    href: '/watch-parties',
    tag: 'Social',
    blurb: 'Schedule a sync-watch with friends. Real-time chat, shared playback position, and scene-timeline comments.',
    accent: 'border-cyan-500/40 from-cyan-500/15 to-transparent',
  },
  {
    title: 'Group Compromise',
    href: '/vibe?mode=compromise',
    tag: 'AI',
    blurb: 'Three friends, three tastes, one movie. The compromise engine finds a pick everyone will tolerate.',
    accent: 'border-indigo-500/40 from-indigo-500/15 to-transparent',
  },
];

export default function DiscoverPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-[0.3em] text-[#D4A853] mb-3">Discover</p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Find your next favourite film
          </h1>
          <p className="text-[#9ca3af] mt-4 max-w-2xl">
            Nine tools that go beyond simple search — from semantic vibe matching to AI-driven
            director Q&A. Built to surface films you would never find on your own.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`group relative rounded-2xl border bg-gradient-to-br ${f.accent} p-6 hover:scale-[1.02] transition-transform`}
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold">{f.title}</h2>
                <span className="text-[10px] uppercase tracking-wider bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                  {f.tag}
                </span>
              </div>
              <p className="text-sm text-[#9ca3af] leading-relaxed">{f.blurb}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D4A853]/10 border border-[#D4A853]/30 text-sm font-medium text-[#D4A853] group-hover:bg-[#D4A853] group-hover:text-black group-hover:gap-2.5 transition-all">
                Open <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
