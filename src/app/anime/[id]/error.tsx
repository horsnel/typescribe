'use client';

export default function AnimeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Failed to load anime</h2>
        <p className="text-sm text-[#6b7280] mb-6">The anime data might be temporarily unavailable.</p>
        <button onClick={reset} className="px-5 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-600 transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
