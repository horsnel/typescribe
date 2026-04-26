'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Mood {
  id: string;
  label: string;
  emoji: string;
  genres: number[];
  theme: string;
  color: string;
  description: string;
}

const MOODS: Mood[] = [
  {
    id: 'funny-relaxing',
    label: 'Funny + Relaxing',
    emoji: '😂',
    genres: [35], // Comedy
    theme: 'feel-good',
    color: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30 hover:border-yellow-400/50',
    description: 'Light-hearted laughs & chill vibes',
  },
  {
    id: 'dark-emotional',
    label: 'Dark + Emotional',
    emoji: '🌑',
    genres: [18, 80], // Drama, Crime
    theme: 'dark',
    color: 'from-gray-500/20 to-slate-500/20 border-gray-500/30 hover:border-gray-400/50',
    description: 'Deep, intense, thought-provoking',
  },
  {
    id: 'mind-bending',
    label: 'Mind-Bending',
    emoji: '🧠',
    genres: [878, 9648], // Sci-Fi, Mystery
    theme: 'mind-bending',
    color: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30 hover:border-purple-400/50',
    description: 'Twists that make you think',
  },
  {
    id: 'feel-good',
    label: 'Feel-Good',
    emoji: '☀️',
    genres: [10749, 35], // Romance, Comedy
    theme: 'uplifting',
    color: 'from-pink-500/20 to-rose-500/20 border-pink-500/30 hover:border-pink-400/50',
    description: 'Warm, uplifting, inspiring',
  },
  {
    id: 'adrenaline-rush',
    label: 'Adrenaline Rush',
    emoji: '🔥',
    genres: [28, 53], // Action, Thriller
    theme: 'intense',
    color: 'from-red-500/20 to-orange-500/20 border-red-500/30 hover:border-red-400/50',
    description: 'Heart-pounding action & suspense',
  },
  {
    id: 'existential-dread',
    label: 'Existential Dread',
    emoji: '🕳️',
    genres: [878, 27], // Sci-Fi, Horror
    theme: 'existential',
    color: 'from-violet-500/20 to-black/20 border-violet-500/30 hover:border-violet-400/50',
    description: 'Philosophical horror & cosmic fear',
  },
  {
    id: 'cozy',
    label: 'Cozy',
    emoji: '☕',
    genres: [18, 10749], // Drama, Romance
    theme: 'cozy',
    color: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30 hover:border-amber-400/50',
    description: 'Comfort viewing, warm & fuzzy',
  },
  {
    id: 'romantic-evening',
    label: 'Romantic Evening',
    emoji: '💕',
    genres: [10749], // Romance
    theme: 'romance',
    color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 hover:border-rose-400/50',
    description: 'Date night, love stories',
  },
];

export default function MoodBrowsingSection() {
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);

  return (
    <section className="py-16 bg-[#050507] px-4 sm:px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-white mb-3">
            What&apos;s Your <span className="text-purple-400">Mood</span>?
          </h2>
          <p className="text-[#9ca3af] max-w-xl mx-auto">
            Skip the genres — browse by how you want to feel. Each mood curates the perfect selection for your vibe.
          </p>
        </div>

        {/* Mood Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOODS.map((mood) => (
            <Link
              key={mood.id}
              href={`/browse?genres=${mood.genres.join(',')}&theme=${mood.theme}`}
              className={`group relative bg-gradient-to-br ${mood.color} border rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/5 ${
                hoveredMood === mood.id ? 'scale-[1.02]' : ''
              }`}
              onMouseEnter={() => setHoveredMood(mood.id)}
              onMouseLeave={() => setHoveredMood(null)}
            >
              <span className="text-3xl mb-3 block">{mood.emoji}</span>
              <h3 className="text-sm font-bold text-white mb-1">{mood.label}</h3>
              <p className="text-xs text-[#9ca3af] leading-relaxed">{mood.description}</p>
              <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-xs text-purple-400">Explore →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
