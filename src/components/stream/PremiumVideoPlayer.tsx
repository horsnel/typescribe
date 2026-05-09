'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, SkipBack, SkipForward,
  Settings, ChevronLeft, Subtitles, Globe,
  X, Check, ExternalLink
} from 'lucide-react';

/* ─── Types ─── */

interface MovieData {
  id: string;
  title: string;
  year: number;
  rating: number;
  duration: string;
  genres: string[];
  quality: string;
  poster: string;
  backdrop: string;
  description: string;
  source: string;
  videoUrl: string;
  videoType?: 'direct' | 'youtube' | 'vimeo' | 'embed';
  languages: string[];
  subtitles: string[];
  sourceUrl?: string;
}

interface PremiumVideoPlayerProps {
  movie: MovieData;
}

/* ─── Constants ─── */

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/* ─── Helper ─── */

function formatTime(s: number): string {
  if (!isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Determine the video type from the URL if not explicitly provided.
 */
function detectVideoType(url: string): 'direct' | 'youtube' | 'vimeo' | 'embed' {
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) return 'youtube';
  if (url.includes('vimeo.com/')) return 'vimeo';
  if (url.includes('archive.org/') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogv')) return 'direct';
  return 'embed';
}

/* ─── Component ─── */

export default function PremiumVideoPlayer({ movie }: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Determine video type
  const videoType = movie.videoType || detectVideoType(movie.videoUrl);
  const isIframe = videoType === 'youtube' || videoType === 'vimeo' || videoType === 'embed';
  const isDirect = videoType === 'direct';

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Menu states
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Settings
  const [selectedSpeed, setSelectedSpeed] = useState(1);

  // Seek preview
  const [seekPreview, setSeekPreview] = useState<{ time: number; x: number } | null>(null);

  // Close all menus
  const closeAllMenus = useCallback(() => {
    setShowSpeedMenu(false);
  }, []);

  // Show controls temporarily
  const showControls = useCallback(() => {
    setControlsVisible(true);
    setCursorVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (isPlaying) {
        setControlsVisible(false);
        setCursorVisible(false);
        closeAllMenus();
      }
    }, 3000);
  }, [isPlaying, closeAllMenus]);

  // Mouse move handler
  const handleMouseMove = useCallback(() => {
    showControls();
  }, [showControls]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (isIframe) return; // No keyboard control for iframe
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (video.paused) { video.play(); setIsPlaying(true); }
          else { video.pause(); setIsPlaying(false); }
          showControls();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          showControls();
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          showControls();
          break;
        case 'arrowup':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          setVolume(video.volume);
          setIsMuted(video.volume === 0);
          showControls();
          break;
        case 'arrowdown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          setVolume(video.volume);
          setIsMuted(video.volume === 0);
          showControls();
          break;
        case 'm':
          video.muted = !video.muted;
          setIsMuted(video.muted);
          showControls();
          break;
        case 'f':
          toggleFullscreen();
          showControls();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, toggleFullscreen, isIframe]);

  // Video event handlers
  useEffect(() => {
    if (isIframe) return;
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => { if (isFinite(video.duration)) setDuration(video.duration); };
    const onLoadedData = () => { setIsLoading(false); };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlaying = () => setIsLoading(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => { setIsLoading(false); setIsPlaying(false); };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('error', onError);
    };
  }, [isIframe]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-play on mount for direct videos
  useEffect(() => {
    if (isIframe) {
      setIsLoading(false);
      setIsPlaying(true);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;

    const safetyTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 8000);

    video.play().then(() => {
      setIsPlaying(true);
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(() => {
      setIsPlaying(false);
      setIsLoading(false);
      clearTimeout(safetyTimeout);
    });

    return () => clearTimeout(safetyTimeout);
  }, [isIframe]);

  // Play/Pause
  const togglePlay = () => {
    if (isIframe) return; // Can't control iframe playback
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); }
    else { video.pause(); setIsPlaying(false); }
  };

  // Volume
  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Seek
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = x * video.duration;
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = progressRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setSeekPreview({ time: x * duration, x: e.clientX - rect.left });
  };

  // Speed
  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (video) video.playbackRate = speed;
    setSelectedSpeed(speed);
    setShowSpeedMenu(false);
  };

  // Volume icon
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Source label for the video type badge
  const sourceBadge = videoType === 'youtube' ? 'YouTube' :
    videoType === 'vimeo' ? 'Vimeo' :
    videoType === 'embed' ? 'External' :
    videoType === 'direct' ? 'Direct' : 'Video';

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (isPlaying) {
          setControlsVisible(false);
          setCursorVisible(false);
          closeAllMenus();
        }
      }}
    >
      {/* Cursor style */}
      <style>{`
        .player-cursor-hidden { cursor: none !important; }
        .player-cursor-hidden * { cursor: none !important; }
      `}</style>

      {/* ─── Iframe Player (YouTube / Vimeo / Embed) ─── */}
      {isIframe && (
        <iframe
          src={movie.videoUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={movie.title}
        />
      )}

      {/* ─── Direct Video Player ─── */}
      {isDirect && (
        <video
          ref={videoRef}
          src={movie.videoUrl}
          className="w-full h-full object-contain"
          playsInline
          autoPlay
          muted
          preload="metadata"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
        />
      )}

      {/* Loading spinner (direct video only) */}
      {isDirect && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 border-[3px] border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
        </div>
      )}

      {/* Source credits watermark */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none opacity-40">
        <span className="text-[10px] text-white/70">Source: {movie.source} · {sourceBadge}</span>
      </div>

      {/* ─── Controls Overlay (direct video only) ─── */}
      {isDirect && (
        <div
          className={`absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${!cursorVisible ? 'player-cursor-hidden' : ''}`}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/stream"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <h2 className="text-white text-sm md:text-base font-semibold">{movie.title}</h2>
                <p className="text-white/50 text-xs">{movie.year} · {movie.duration}</p>
              </div>
            </div>
          </div>

          {/* Center play/pause button */}
          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <button
                onClick={togglePlay}
                className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/20 transition-colors pointer-events-auto border border-white/10"
                aria-label="Play"
              >
                <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="group/progress relative h-1.5 hover:h-2.5 transition-all duration-150 cursor-pointer mb-3 rounded-full"
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setSeekPreview(null)}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              <div
                className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              <div
                className="absolute top-0 left-0 h-full bg-[#D4A853] rounded-full"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#D4A853] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 7px)` : '-7px' }}
              />
              {seekPreview && duration > 0 && (
                <div
                  className="absolute -top-8 bg-black/90 text-white text-xs px-2 py-1 rounded pointer-events-none"
                  style={{ left: `${seekPreview.x}px`, transform: 'translateX(-50%)' }}
                >
                  {formatTime(seekPreview.time)}
                </div>
              )}
            </div>

            {/* Control buttons row */}
            <div className="flex items-center justify-between gap-2">
              {/* Left controls */}
              <div className="flex items-center gap-2 md:gap-3">
                <button onClick={togglePlay} className="text-white hover:text-[#D4A853] transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                </button>

                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }} className="text-white/80 hover:text-[#D4A853] transition-colors hidden sm:block" aria-label="Skip back 10s">
                  <SkipBack className="w-4 h-4" strokeWidth={1.5} />
                </button>
                <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); }} className="text-white/80 hover:text-[#D4A853] transition-colors hidden sm:block" aria-label="Skip forward 10s">
                  <SkipForward className="w-4 h-4" strokeWidth={1.5} />
                </button>

                <div className="flex items-center gap-1 group/vol">
                  <button onClick={toggleMute} className="text-white/80 hover:text-[#D4A853] transition-colors" aria-label={isMuted ? 'Unmute' : 'Mute'}>
                    <VolumeIcon className="w-5 h-5" strokeWidth={1.5} />
                  </button>
                  <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-200">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                      className="w-20 h-1 accent-[#D4A853] cursor-pointer"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                <div className="text-white/70 text-xs font-mono hidden sm:block">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Speed */}
                <div className="relative">
                  <button
                    onClick={() => { closeAllMenus(); setShowSpeedMenu(!showSpeedMenu); }}
                    className={`text-xs px-1.5 py-0.5 rounded transition-colors ${selectedSpeed !== 1 ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-white/80 hover:text-[#D4A853]'}`}
                    aria-label="Playback speed"
                  >
                    {selectedSpeed === 1 ? '1x' : `${selectedSpeed}x`}
                  </button>
                </div>

                <button onClick={toggleFullscreen} className="text-white/80 hover:text-[#D4A853] transition-colors" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                  {isFullscreen ? <Minimize className="w-5 h-5" strokeWidth={1.5} /> : <Maximize className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>

          {/* Speed Menu */}
          {showSpeedMenu && (
            <div className="absolute bottom-24 right-12 md:right-20 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[140px] z-30">
              <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28]">Speed</div>
              {SPEED_OPTIONS.map((speed) => (
                <button
                  key={speed}
                  onClick={() => handleSpeedChange(speed)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedSpeed === speed ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
                >
                  <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                  {selectedSpeed === speed && <Check className="w-4 h-4" strokeWidth={2} />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Iframe Controls Overlay (simplified top bar only) ─── */}
      {isIframe && (
        <div
          className={`absolute inset-0 z-20 transition-opacity duration-300 pointer-events-none ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4 pointer-events-auto">
            <div className="flex items-center gap-4">
              <Link
                href="/stream"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <h2 className="text-white text-sm md:text-base font-semibold">{movie.title}</h2>
                <p className="text-white/50 text-xs">{movie.year} · {movie.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 bg-white/10 backdrop-blur-sm text-white/70 rounded">
                {sourceBadge}
              </span>
              {movie.sourceUrl && (
                <a
                  href={movie.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-white transition-colors"
                  aria-label="Open original source"
                >
                  <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini progress bar (always visible for direct video) */}
      {isDirect && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10 bg-white/10 pointer-events-none">
          <div
            className="h-full bg-[#D4A853]"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {isDirect && (
        <div className="absolute bottom-16 left-4 z-10 pointer-events-none opacity-0" id="shortcuts-hint">
          <div className="text-[10px] text-white/30 space-y-0.5">
            <p>Space: Play/Pause · ←→: Seek 10s · ↑↓: Volume</p>
            <p>M: Mute · F: Fullscreen</p>
          </div>
        </div>
      )}
    </div>
  );
}
