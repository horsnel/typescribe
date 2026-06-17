'use client';

import { Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function StreamWatchPage() {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center">
          <Lock className="w-7 h-7 text-[#D4A853]" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Coming Soon</h1>
        <p className="text-[#9ca3af] text-sm mb-6 max-w-sm mx-auto">
          StreamFlix is not available yet. We&apos;re working hard to bring you free, legal streaming.
        </p>
        <Link
          href="/stream"
          className="inline-flex items-center gap-2 text-[#D4A853] hover:text-[#B8922F] transition-colors font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Stream
        </Link>
      </div>
    </div>
  );
}