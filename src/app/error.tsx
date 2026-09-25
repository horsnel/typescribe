'use client';

import { useEffect, useState } from 'react';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [autoRetried, setAutoRetried] = useState(false);

  useEffect(() => {
    // Surface the real error in the console so support/debugging is possible.
    console.error('[Typescribe] Page error:', error);
    // One silent automatic retry — a transient data/API failure recovers
    // without the user noticing anything beyond a brief flash.
    if (!autoRetried) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- retry gate state, mirrors existing localStorage-restore pattern
      setAutoRetried(true);
      const t = setTimeout(() => reset(), 400);
      return () => clearTimeout(t);
    }
  }, [error, reset, autoRetried]);

  return (
    <div className="min-h-[70vh] bg-[#050507] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-[#6b7280] mb-1">This page hit an unexpected error while loading.</p>
        <p className="text-xs text-[#4b5563] mb-6">
          {error.digest ? <span>Reference: {error.digest}</span> : (error.message || 'An unexpected error occurred')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-lg bg-[#D4A853] text-white font-medium hover:bg-[#B8922F] transition-colors"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-lg border border-[#2a2a35] text-[#9ca3af] font-medium hover:text-white hover:border-[#3a3a45] transition-colors"
          >
            Reload page
          </button>
        </div>
        <p className="text-xs text-[#4b5563] mt-5">
          If this keeps happening, a hard refresh (Ctrl/Cmd + Shift + R) usually clears it.
        </p>
      </div>
    </div>
  );
}
