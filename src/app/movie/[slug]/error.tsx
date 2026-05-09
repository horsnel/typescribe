'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, ArrowLeft, RefreshCw } from 'lucide-react';

export default function MovieError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for debugging
    console.error('[Movie Page Error]', error.message, error.stack);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 rounded-full bg-[#D4A853]/10 border-2 border-[#D4A853]/20 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-10 h-10 text-[#D4A853]" strokeWidth={1.5} />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">Something Went Wrong</h1>
        <p className="text-[#9ca3af] mb-2 leading-relaxed">
          We hit an unexpected error while loading this movie. This might be a temporary issue.
        </p>
        {error.message && (
          <p className="text-xs text-[#6b7280] bg-[#0c0c10] border border-[#1e1e28] rounded-lg p-3 mb-6 font-mono break-all">
            {error.message}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#D4A853] hover:bg-[#B8922F] text-white px-5 py-2.5 rounded-lg font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} /> Try Again
          </button>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 bg-[#111118] border border-[#1e1e28] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#1a1a22] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} /> Browse Movies
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#111118] border border-[#1e1e28] text-white px-5 py-2.5 rounded-lg font-medium hover:bg-[#1a1a22] transition-colors"
          >
            <Home className="w-4 h-4" strokeWidth={1.5} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
