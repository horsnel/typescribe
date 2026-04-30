'use client';

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Search failed</h2>
        <p className="text-sm text-[#6b7280] mb-6">Unable to reach our data sources right now.</p>
        <button onClick={reset} className="px-5 py-2.5 rounded-lg bg-[#d4a853] text-white font-medium hover:bg-[#b8922e] transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
