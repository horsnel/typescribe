'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Smile, Moon, Brain, Sun, Flame, Orbit, Coffee, Heart } from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Smile,
  Moon,
  Brain,
  Sun,
  Flame,
  Orbit,
  Coffee,
  Heart,
};

interface Mood {
  id: string;
  label: string;
  icon: string;
  genres: number[];
  theme: string;
  description: string;
}

const MOODS: Mood[] = [
  {
    id: 'funny-relaxing',
    label: 'Funny + Relaxing',
    icon: 'Smile',
    genres: [35], // Comedy
    theme: 'feel-good',
    description: 'Light-hearted laughs & chill vibes',
  },
  {
    id: 'dark-emotional',
    label: 'Dark + Emotional',
    icon: 'Moon',
    genres: [18, 80], // Drama, Crime
    theme: 'dark',
    description: 'Deep, intense, thought-provoking',
  },
  {
    id: 'mind-bending',
    label: 'Mind-Bending',
    icon: 'Brain',
    genres: [878, 9648], // Sci-Fi, Mystery
    theme: 'mind-bending',
    description: 'Twists that make you think',
  },
  {
    id: 'feel-good',
    label: 'Feel-Good',
    icon: 'Sun',
    genres: [10749, 35], // Romance, Comedy
    theme: 'uplifting',
    description: 'Warm, uplifting, inspiring',
  },
  {
    id: 'adrenaline-rush',
    label: 'Adrenaline Rush',
    icon: 'Flame',
    genres: [28, 53], // Action, Thriller
    theme: 'intense',
    description: 'Heart-pounding action & suspense',
  },
  {
    id: 'existential-dread',
    label: 'Existential Dread',
    icon: 'Orbit',
    genres: [878, 27], // Sci-Fi, Horror
    theme: 'existential',
    description: 'Philosophical horror & cosmic fear',
  },
  {
    id: 'cozy',
    label: 'Cozy',
    icon: 'Coffee',
    genres: [18, 10749], // Drama, Romance
    theme: 'cozy',
    description: 'Comfort viewing, warm & fuzzy',
  },
  {
    id: 'romantic-evening',
    label: 'Romantic Evening',
    icon: 'Heart',
    genres: [10749], // Romance
    theme: 'romance',
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
            What&apos;s Your <span className="text-[#D4A853]">Mood</span>?
          </h2>
          <p className="text-[#9ca3af] max-w-xl mx-auto">
            Skip the genres — browse by how you want to feel. Each mood curates the perfect selection for your vibe.
          </p>
        </div>

        {/* Mood Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MOODS.map((mood) => {
            const IconComp = ICON_MAP[mood.icon];
            return (
              <Link
                key={mood.id}
                href={`/browse?genres=${mood.genres.join(',')}&theme=${mood.theme}`}
                className={`group relative bg-gradient-to-br from-[#D4A853]/10 to-[#0c0c10] border border-[#D4A853]/20 hover:border-[#D4A853]/40 rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#D4A853]/5 ${
                  hoveredMood === mood.id ? 'scale-[1.02]' : ''
                }`}
                onMouseEnter={() => setHoveredMood(mood.id)}
                onMouseLeave={() => setHoveredMood(null)}
              >
                {IconComp && <IconComp className="w-7 h-7 text-[#D4A853] mb-3" strokeWidth={1.5} />}
                <h3 className="text-sm font-bold text-white mb-1">{mood.label}</h3>
                <p className="text-xs text-[#9ca3af] leading-relaxed">{mood.description}</p>
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs text-[#D4A853]">Explore →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
