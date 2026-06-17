'use client';

import { Lock, Play, Sparkles, Bell } from 'lucide-react';
import Link from 'next/link';

export default function StreamPage() {
  return (
    <div className="min-h-screen bg-[#050507] flex items-center justify-center relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#D4A853]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#D4A853]/3 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[#1e1e28]/30 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#1e1e28]/20 rounded-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
        {/* Lock icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-2xl bg-[#D4A853]/10 border border-[#D4A853]/20 flex items-center justify-center">
          <Lock className="w-9 h-9 text-[#D4A853]" strokeWidth={1.5} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#D4A853]/10 border border-[#D4A853]/20 rounded-full mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#D4A853]" strokeWidth={1.5} />
          <span className="text-xs font-medium text-[#D4A853] tracking-wide uppercase">Coming Soon</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
          StreamFlix
        </h1>

        {/* Description */}
        <p className="text-[#9ca3af] text-base md:text-lg leading-relaxed mb-8 max-w-md mx-auto">
          We&apos;re building something incredible. Free, legal streaming of movies and anime — all in one place. Stay tuned.
        </p>

        {/* Features preview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
          <div className="p-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
            <Play className="w-5 h-5 text-[#D4A853] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-[#9ca3af]">Free Legal Streaming</p>
          </div>
          <div className="p-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
            <Sparkles className="w-5 h-5 text-[#D4A853] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-[#9ca3af]">4K Quality</p>
          </div>
          <div className="p-4 bg-[#0c0c10] border border-[#1e1e28] rounded-xl">
            <Bell className="w-5 h-5 text-[#D4A853] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-[#9ca3af]">Get Notified</p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A853] hover:bg-[#B8922F] text-white font-bold rounded-xl transition-colors shadow-lg shadow-[#D4A853]/20"
        >
          Back to Home
        </Link>

        <p className="text-[#6b7280] text-xs mt-6">
          Launching soon · Free · Ad-supported
        </p>
      </div>
    </div>
  );
}