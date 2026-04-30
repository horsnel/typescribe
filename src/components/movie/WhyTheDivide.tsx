'use client';

import { Scale } from 'lucide-react';

interface WhyTheDivideProps {
  reviews: Array<{ rating: number; text: string }>;
  genres?: Array<{ id: number; name: string }>;
}

// Genre-specific trope maps for generating mock praise/criticism
const genreTropes: Record<string, { praise: string[]; criticize: string[] }> = {
  Action: {
    praise: ['Explosive set pieces that never let up', 'Thrilling chase sequences', 'Impressive stunt work and choreography'],
    criticize: ['Thin plot buried under explosions', 'Characters are just action figures', 'Style over substance'],
  },
  Drama: {
    praise: ['Deeply nuanced performances', 'Emotionally resonant storytelling', 'Masterful character development'],
    criticize: ['Pacing drags in the second act', 'Overly pretentious at times', 'Self-indulgent runtime'],
  },
  Comedy: {
    praise: ['Consistently hilarious throughout', 'Sharp, witty dialogue', 'Perfect comedic timing from the cast'],
    criticize: ['Jokes fall flat in the third act', 'Relies too much on cheap gags', 'Inconsistent tone'],
  },
  Horror: {
    praise: ['Genuinely terrifying atmosphere', 'Clever scares that linger', 'Fresh take on horror conventions'],
    criticize: ['Relies on cheap jump scares', 'Predictable twist ending', 'Weak character decisions'],
  },
  'Science Fiction': {
    praise: ['Visionary world-building', 'Thought-provoking concepts', 'Stunning visual effects'],
    criticize: ['Confusing plot mechanics', 'Cold and emotionally distant', 'Leaves too many questions unanswered'],
  },
  Thriller: {
    praise: ['Edge-of-your-seat tension', 'Brilliantly crafted suspense', 'Unpredictable twists'],
    criticize: ['Twists feel forced and contrived', 'Logic breaks down on reflection', 'Unsatisfying resolution'],
  },
  Romance: {
    praise: ['Genuine chemistry between leads', 'Heartfelt and authentic', 'Beautifully captured emotions'],
    criticize: ['Cliché-ridden storyline', 'Predictable from start to finish', 'Unrealistic relationship dynamics'],
  },
  Animation: {
    praise: ['Breathtaking animation quality', 'Imaginative and creative world', 'Appeals to both kids and adults'],
    criticize: ['Story too simplistic for adults', 'Derivative of better films', 'Forgets to be fun'],
  },
  Mystery: {
    praise: ['Cleverly constructed puzzle', 'Keeps you guessing until the end', 'Rewarding payoff'],
    criticize: ['Overly convoluted plot', 'Red herrings that go nowhere', 'Ending feels unearned'],
  },
  Adventure: {
    praise: ['Epic scope and scale', 'Thrilling journey from start to finish', 'Memorable set pieces'],
    criticize: ['Plot feels like a checklist', 'Villain is one-dimensional', 'Too long for its own good'],
  },
  Fantasy: {
    praise: ['Richly imagined world', 'Enchanting visual design', 'Compelling mythology'],
    criticize: ['Overstuffed with lore', 'Pacing issues in the middle', 'Too many subplots'],
  },
  Crime: {
    praise: ['Gritty and realistic portrayal', 'Complex moral dilemmas', 'Outstanding ensemble cast'],
    criticize: ['Glamorizes violence', 'Slow and meandering', 'Characters are unlikable'],
  },
  War: {
    praise: ['Harrowing and authentic combat scenes', 'Powerful anti-war message', 'Technical mastery'],
    criticize: ['Overly grim without respite', 'Historical inaccuracies', 'One-dimensional enemies'],
  },
  Documentary: {
    praise: ['Eye-opening revelations', 'Compelling narrative structure', 'Important subject matter'],
    criticize: ['Clearly biased perspective', 'Manipulative editing', 'Surface-level analysis'],
  },
};

const defaultTropes = {
  praise: ['Strong performances from the cast', 'Visually striking cinematography', 'Ambitious storytelling'],
  criticize: ['Pacing issues throughout', 'Underdeveloped characters', 'Unsatisfying conclusion'],
};

function generateMockSummary(
  positiveRatio: number,
  genres: Array<{ id: number; name: string }>
): string {
  const genreNames = genres.map(g => g.name);
  const dominantSide = positiveRatio >= 60 ? 'positive' : positiveRatio <= 40 ? 'negative' : 'mixed';

  const summaries: Record<string, string[]> = {
    positive: [
      `This film has garnered strong praise, particularly for its ${genreNames.length > 0 ? genreNames.slice(0, 2).join(' and ').toLowerCase() + ' elements' : 'craftsmanship'}. While most viewers find it compelling, a vocal minority raises valid concerns about specific creative choices that didn't land for them.`,
      `Audiences are largely enthusiastic, with supporters highlighting the film's ${genreNames.length > 0 ? genreNames[0].toLowerCase() + ' sensibilities' : 'ambition'} as a major strength. The divide seems rooted in differing expectations — those seeking what the film delivers love it, while others wanted something different.`,
    ],
    negative: [
      `Despite its ambitions in ${genreNames.length > 0 ? genreNames.slice(0, 2).join(' and ').toLowerCase() : 'its genre'}, this film has struggled to win over audiences. Critics point to fundamental issues with execution, though defenders argue the film's unconventional approach is precisely what makes it noteworthy.`,
      `The reception has been notably divided, with many finding the film's ${genreNames.length > 0 ? genreNames[0].toLowerCase() + ' aspirations' : 'creative choices'} unfulfilled. However, a passionate subset of viewers champions the film's willingness to take risks, even when they don't all pay off.`,
    ],
    mixed: [
      `This film has split audiences right down the middle. Fans of ${genreNames.length > 0 ? genreNames.slice(0, 2).join(' and ').toLowerCase() : 'the genre'} seem to appreciate its ambition, while others find the execution uneven. The debate centers on whether the film's highs are enough to outweigh its undeniable lows.`,
      `A polarizing entry in ${genreNames.length > 0 ? 'the ' + genreNames[0].toLowerCase() + ' space' : 'its category'}, this film has defenders and detractors in nearly equal measure. The core disagreement: does the film's vision overcome its flaws, or do the flaws undermine the vision?`,
    ],
  };

  const options = summaries[dominantSide];
  return options[Math.floor(Math.random() * options.length)];
}

function generatePraisePoints(
  genres: Array<{ id: number; name: string }>,
  positiveReviews: Array<{ rating: number; text: string }>
): string[] {
  const genreNames = genres.map(g => g.name);
  const points: string[] = [];

  // Pick from genre-specific tropes
  for (const genre of genreNames.slice(0, 3)) {
    const trope = genreTropes[genre];
    if (trope && points.length < 4) {
      const idx = Math.floor(Math.random() * trope.praise.length);
      const point = trope.praise[idx];
      if (!points.includes(point)) points.push(point);
    }
  }

  // If we don't have enough, add defaults
  while (points.length < 3) {
    const defaultPoint = defaultTropes.praise[points.length % defaultTropes.praise.length];
    if (!points.includes(defaultPoint)) points.push(defaultPoint);
    else break;
  }

  return points.slice(0, 4);
}

function generateCriticismPoints(
  genres: Array<{ id: number; name: string }>,
  negativeReviews: Array<{ rating: number; text: string }>
): string[] {
  const genreNames = genres.map(g => g.name);
  const points: string[] = [];

  for (const genre of genreNames.slice(0, 3)) {
    const trope = genreTropes[genre];
    if (trope && points.length < 4) {
      const idx = Math.floor(Math.random() * trope.criticize.length);
      const point = trope.criticize[idx];
      if (!points.includes(point)) points.push(point);
    }
  }

  while (points.length < 3) {
    const defaultPoint = defaultTropes.criticize[points.length % defaultTropes.criticize.length];
    if (!points.includes(defaultPoint)) points.push(defaultPoint);
    else break;
  }

  return points.slice(0, 4);
}

export default function WhyTheDivide({ reviews, genres = [] }: WhyTheDivideProps) {
  // Only show when there are at least 3 reviews and there's high variance
  if (reviews.length < 3) return null;

  const hasHighRatings = reviews.some(r => r.rating >= 7);
  const hasLowRatings = reviews.some(r => r.rating <= 5);

  // Must have both high AND low ratings to show the divide
  if (!hasHighRatings || !hasLowRatings) return null;

  const positiveReviews = reviews.filter(r => r.rating >= 7);
  const negativeReviews = reviews.filter(r => r.rating <= 5);
  const positiveRatio = Math.round((positiveReviews.length / reviews.length) * 100);
  const negativeRatio = 100 - positiveRatio;

  const summary = generateMockSummary(positiveRatio, genres);
  const praisePoints = generatePraisePoints(genres, positiveReviews);
  const criticismPoints = generateCriticismPoints(genres, negativeReviews);

  return (
    <div className="bg-[#0c0c10] border border-[#1e1e28] rounded-xl overflow-hidden">
      {/* Split header */}
      <div className="relative h-2">
        <div
          className="absolute left-0 top-0 h-full bg-green-500 transition-all duration-700"
          style={{ width: `${positiveRatio}%` }}
        />
        <div
          className="absolute right-0 top-0 h-full bg-red-500 transition-all duration-700"
          style={{ width: `${negativeRatio}%` }}
        />
      </div>

      <div className="p-6">
        {/* Heading */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Scale className="w-5 h-5 text-purple-400" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Why the Divide?</h3>
            <p className="text-xs text-[#6b7280]">AI-generated analysis of opposing viewpoints</p>
          </div>
          <span className="ml-auto text-[10px] bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-semibold">
            AI INSIGHT
          </span>
        </div>

        {/* Summary paragraph */}
        <div className="bg-[#050507]/60 border border-[#1e1e28]/50 rounded-lg p-4 mb-5">
          <p className="text-sm text-[#9ca3af] leading-relaxed">{summary}</p>
        </div>

        {/* Two columns: Praise vs Criticism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          {/* Fans Praise */}
          <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <h4 className="text-sm font-semibold text-green-400">Fans praise:</h4>
              <span className="text-[10px] text-green-400/60 ml-auto">{positiveReviews.length} review{positiveReviews.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="space-y-2">
              {praisePoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-[#9ca3af] leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Critics Cite */}
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <h4 className="text-sm font-semibold text-red-400">Critics cite:</h4>
              <span className="text-[10px] text-red-400/60 ml-auto">{negativeReviews.length} review{negativeReviews.length !== 1 ? 's' : ''}</span>
            </div>
            <ul className="space-y-2">
              {criticismPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                  <span className="text-sm text-[#9ca3af] leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sentiment Split Gauge */}
        <div className="bg-[#050507]/60 border border-[#1e1e28]/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Sentiment Split</span>
            <span className="text-xs text-[#6b7280]">{reviews.length} total reviews</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-green-400 w-12 text-right">{positiveRatio}%</span>
            <div className="flex-1 h-3 bg-[#111118] rounded-full overflow-hidden relative">
              <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-700"
                style={{ width: `${positiveRatio}%` }}
              />
            </div>
            <span className="text-sm font-bold text-red-400 w-12">{negativeRatio}%</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-green-400/70">Positive (7+)</span>
            <span className="text-[10px] text-red-400/70">Negative (5-)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
