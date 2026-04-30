'use client';

import { useEffect, useCallback, useState } from 'react';
import { X, Play, Loader2 } from 'lucide-react';

interface TrailerModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** YouTube video ID for the trailer */
  youtubeId?: string;
  /** iTunes preview URL (30-sec m4v) */
  itunesPreviewUrl?: string;
  /** iTunes artwork URL for poster/thumbnail */
  itunesArtworkUrl?: string;
  /** Movie title for accessibility */
  title: string;
}

export default function TrailerModal({
  isOpen,
  onClose,
  youtubeId,
  itunesPreviewUrl,
  itunesArtworkUrl,
  title,
}: TrailerModalProps) {
  const [videoReady, setVideoReady] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setVideoReady(false);
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const hasYouTube = !!youtubeId;
  const hasITunes = !!itunesPreviewUrl;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ animation: 'trailerFadeIn 0.2s ease-out' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} trailer`}
    >
      {/* Backdrop — blurry dark overlay */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        style={{ animation: 'trailerFadeIn 0.2s ease-out' }}
      />

      {/* Modal content */}
      <div
        className="relative z-10 w-full max-w-4xl"
        style={{ animation: 'trailerScaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 sm:top-2 sm:right-2 sm:-translate-y-full flex items-center gap-2 px-3 py-2 rounded-full
            bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/10
            text-white text-sm font-medium transition-all duration-200
            hover:border-white/20 z-20"
          aria-label="Close trailer"
        >
          <X className="w-4 h-4" strokeWidth={2} />
          <span className="hidden sm:inline">Close</span>
        </button>

        {/* Video container */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black shadow-2xl shadow-black/50 border border-white/[0.06]">
          {/* Loading state */}
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-[#d4a853] animate-spin" strokeWidth={1.5} />
            </div>
          )}

          {/* YouTube embed */}
          {hasYouTube && (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={`${title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
              onLoad={() => setVideoReady(true)}
            />
          )}

          {/* iTunes preview fallback */}
          {!hasYouTube && hasITunes && (
            <video
              src={itunesPreviewUrl}
              autoPlay
              controls
              className="w-full h-full object-contain"
              poster={itunesArtworkUrl || undefined}
              onCanPlay={() => setVideoReady(true)}
            >
              Your browser does not support the video tag.
            </video>
          )}

          {/* No trailer available */}
          {!hasYouTube && !hasITunes && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Play className="w-12 h-12 text-[#2a2a35] mb-3" strokeWidth={1.5} />
              <p className="text-sm text-[#6b7280]">No trailer available</p>
            </div>
          )}
        </div>

        {/* Movie title below video */}
        <div className="mt-3 text-center">
          <p className="text-sm text-white/70 font-medium truncate">{title}</p>
        </div>
      </div>

      {/* Global animation keyframes — injected once via inline style tag */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes trailerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes trailerScaleIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      ` }} />
    </div>
  );
}
