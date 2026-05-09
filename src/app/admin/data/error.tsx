'use client';

import { useEffect } from 'react';

export default function AdminDataError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Data Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
      <div className="bg-[#0c0c10] border border-red-500/20 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
        <h2 className="text-lg font-bold text-red-400 mb-4">Something went wrong</h2>
        <p className="text-sm text-[#9ca3af] mb-4">{error.message || 'An unexpected error occurred'}</p>
        {error.digest && (
          <p className="text-xs text-[#4a4a5a] mb-4">Error digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#D4A853] hover:bg-[#B8922F] text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
