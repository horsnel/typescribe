'use client';

export default function SearchError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-2">Search failed</h2>
        <p className="text-sm text-[#6b7280] mb-6">Unable to reach our data sources right now.</p>
        <button onClick={reset} className="px-5 py-2.5 rounded-lg bg-[#8B5CF6] text-white font-medium hover:bg-[#7C3AED] transition-colors">
          Try again
        </button>
      </div>
    </div>
  );
}
