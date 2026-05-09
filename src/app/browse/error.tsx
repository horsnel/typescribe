'use client';

export default function BrowseError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Failed to load movies</h2>
        <p className="text-sm text-[#6b7280] mb-6">Our data sources might be temporarily unavailable.</p>
        <button onClick={reset} className="px-5 py-2.5 rounded-lg bg-[#D4A853] text-white font-medium hover:bg-[#B8922F] transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
