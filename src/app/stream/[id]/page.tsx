'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Star, Globe, Subtitles, Clock, Calendar, Film, Tag, Volume2, Languages } from 'lucide-react';
import PremiumVideoPlayer from '@/components/stream/PremiumVideoPlayer';

/* ─── Demo Movie Data ─── */

const DEMO_MOVIES = [
  {
    id: 'big-buck-bunny',
    title: 'Big Buck Bunny',
    year: 2008,
    rating: 7.2,
    duration: '9m 56s',
    genres: ['Animation', 'Comedy'],
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/800px-Big_buck_bunny_poster_big.jpg',
    backdrop: 'https://peach.blender.org/wp-content/uploads/bbb-splash.png',
    description: 'A large and lovable bunny deals with three tiny bullies, led by a flying squirrel, who are determined to squelch his happiness.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.2160p.vp9.webm',
    languages: ['English (Original)', 'Spanish (Dubbed)', 'French (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)'],
  },
  {
    id: 'sintel',
    title: 'Sintel',
    year: 2010,
    rating: 7.5,
    duration: '14m 48s',
    genres: ['Animation', 'Fantasy', 'Drama'],
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Sintel_poster.jpg/800px-Sintel_poster.jpg',
    backdrop: 'https://durian.blender.org/wp-content/uploads/2010/06/screenshot-sintel-tunnel.jpg',
    description: 'A lonely young woman, Sintel, helps and befriends a dragon, which she calls Scales. But when Scales is taken from her, she embarks on a dangerous quest to find her friend.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/8/8a/Sintel_Duration_Test.webm/Sintel_Duration_Test.webm.1080p.vp9.webm',
    languages: ['English (Original)', 'Japanese (Dubbed)', 'Korean (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)', 'Korean'],
  },
  {
    id: 'tears-of-steel',
    title: 'Tears of Steel',
    year: 2012,
    rating: 6.8,
    duration: '12m 14s',
    genres: ['Sci-Fi', 'Drama', 'Action'],
    quality: '4K',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Tears_of_Steel_poster.jpg/800px-Tears_of_Steel_poster.jpg',
    backdrop: 'https://mango.blender.org/wp-content/gallery/4k-renders/06_bartos_background.jpg',
    description: 'In an apocalyptic future, a group of soldiers and scientists takes refuge in Amsterdam to try to stop an army of robots from destroying the remnants of humanity.',
    source: 'Blender Foundation • CC BY 3.0',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/3/3c/Tears_of_Steel_4K.webm/Tears_of_Steel_4K.webm.1080p.vp9.webm',
    languages: ['English (Original)', 'German (Dubbed)', 'Spanish (Dubbed)', 'Hindi (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese (Simplified)', 'Arabic', 'Hindi'],
  },
  {
    id: 'elephants-dream',
    title: "Elephant's Dream",
    year: 2006,
    rating: 6.5,
    duration: '10m 54s',
    genres: ['Animation', 'Sci-Fi', 'Drama'],
    quality: 'HD',
    poster: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Elephants_Dream_s1_proog.jpg/800px-Elephants_Dream_s1_proog.jpg',
    backdrop: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Elephants_Dream_s3_both.jpg/1280px-Elephants_Dream_s3_both.jpg',
    description: 'Two strange characters explore a cavernous and seemingly infinite machine. The older one, Proog, acts as a guide and protector while the younger one, Emo, is a skeptical observer.',
    source: 'Blender Foundation • CC BY 2.5',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/e/e8/Elephants_Dream.ogg/Elephants_Dream.ogg.1080p.webm',
    languages: ['English (Original)', 'Dutch (Dubbed)', 'French (Dubbed)'],
    subtitles: ['English', 'Spanish', 'French', 'German', 'Dutch'],
  },
];

/* ─── Page Component ─── */

export default function StreamWatchPage() {
  const params = useParams();
  const id = params.id as string;
  const movie = DEMO_MOVIES.find((m) => m.id === id);

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Movie Not Found</h1>
          <p className="text-[#9ca3af] mb-6">The movie you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/stream" className="text-[#d4a853] hover:underline flex items-center gap-2 justify-center">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            Back to Streaming
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507]">
      {/* Video Player - Full Width */}
      <div className="w-full max-h-[80vh]">
        <PremiumVideoPlayer movie={movie} />
      </div>

      {/* Movie Info Section */}
      <div className="px-4 md:px-12 lg:px-20 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Back link */}
          <Link
            href="/stream"
            className="inline-flex items-center gap-2 text-[#9ca3af] hover:text-[#d4a853] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-sm font-medium">Back to Streaming</span>
          </Link>

          {/* Title & Metadata */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
            {/* Poster */}
            <div className="flex-shrink-0 w-32 md:w-44">
              <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{movie.title}</h1>

              <div className="flex items-center gap-3 flex-wrap mb-4">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${movie.quality === '4K' ? 'bg-[#d4a853] text-black' : 'bg-white/10 text-white/70'}`}>
                  {movie.quality}
                </span>
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <Calendar className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {movie.year}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {movie.duration}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-[#9ca3af]">
                  <Star className="w-3.5 h-3.5 text-[#d4a853] fill-[#d4a853]" strokeWidth={1.5} />
                  {movie.rating}/10
                </div>
              </div>

              {/* Genres */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <Tag className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={1.5} />
                {movie.genres.map((g) => (
                  <span key={g} className="text-xs text-[#9ca3af] bg-[#0c0c10] border border-[#1e1e28] px-2.5 py-1 rounded-full">
                    {g}
                  </span>
                ))}
              </div>

              {/* Description */}
              <p className="text-[#9ca3af] text-sm md:text-base leading-relaxed mb-6">
                {movie.description}
              </p>

              {/* Source */}
              <div className="p-3 bg-[#0c0c10] border border-[#1e1e28] rounded-lg inline-block">
                <p className="text-[10px] text-[#6b7280]">
                  <Film className="w-3 h-3 inline mr-1" strokeWidth={1.5} />
                  Source: {movie.source}
                </p>
              </div>
            </div>
          </div>

          {/* Languages & Subtitles */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Available Languages */}
            <div className="p-5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                <h3 className="text-white font-semibold text-sm">Available Languages</h3>
              </div>
              <div className="space-y-2">
                {movie.languages.map((lang) => {
                  const isOriginal = lang.includes('Original');
                  const isDubbed = lang.includes('Dubbed');
                  return (
                    <div key={lang} className="flex items-center justify-between py-2 px-3 bg-[#050507] rounded-lg">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[#6b7280]" strokeWidth={1.5} />
                        <span className="text-sm text-[#f1f1f4]">{lang}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isOriginal && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-[#d4a853]/20 text-[#d4a853] rounded font-medium">Original</span>
                        )}
                        {isDubbed && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded font-medium">Dubbed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available Subtitles */}
            <div className="p-5 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
              <div className="flex items-center gap-2 mb-4">
                <Subtitles className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
                <h3 className="text-white font-semibold text-sm">Available Subtitles</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {movie.subtitles.map((sub) => (
                  <span key={sub} className="text-xs text-[#9ca3af] bg-[#050507] border border-[#1e1e28] px-3 py-1.5 rounded-full hover:border-[#d4a853]/30 hover:text-[#f1f1f4] transition-colors cursor-default">
                    {sub}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* More Like This */}
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Languages className="w-4 h-4 text-[#d4a853]" strokeWidth={1.5} />
              <h3 className="text-white font-semibold">More Like This</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {DEMO_MOVIES.filter((m) => m.id !== movie.id).map((m) => (
                <Link key={m.id} href={`/stream/${m.id}`} className="group/card">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0c0c10] border border-[#1e1e28]/50">
                    <img
                      src={m.poster}
                      alt={m.title}
                      className="w-full h-full object-cover transition-all duration-300 group-hover/card:scale-105 group-hover/card:brightness-75"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${m.quality === '4K' ? 'bg-[#d4a853] text-black' : 'bg-white/20 text-white/90 backdrop-blur-sm'}`}>
                        {m.quality}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-[#d4a853]/90 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-black fill-black ml-0.5" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
                      </div>
                    </div>
                  </div>
                  <h4 className="mt-2 text-sm font-medium text-[#f1f1f4] truncate group-hover/card:text-[#d4a853] transition-colors">
                    {m.title}
                  </h4>
                  <p className="text-[11px] text-[#9ca3af]">{m.year} · {m.duration}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
