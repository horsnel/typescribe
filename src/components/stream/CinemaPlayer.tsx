'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, SkipBack, SkipForward,
  Settings, ChevronLeft, Subtitles, Globe,
  X, Check, ExternalLink, PictureInPicture2,
  ChevronUp, Film, Loader2, Sparkles
} from 'lucide-react';

/* ─── Types ─── */

export interface CinemaMovieData {
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
  videoType: 'direct' | 'youtube' | 'vimeo' | 'bilibili' | 'hls' | 'embed' | 'linkout';
  embedUrl?: string;
  isEmbeddable: boolean;
  sourceUrl?: string;
  languages: string[];
  subtitles: string[];
  manifestUrl?: string;
}

interface CinemaPlayerProps {
  movie: CinemaMovieData;
}

/* ─── Constants ─── */

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '4K', value: '4K' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: '480p', value: '480p' },
];
const CONTROLS_HIDE_DELAY = 3000;

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
function detectVideoType(url: string): CinemaMovieData['videoType'] {
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) return 'youtube';
  if (url.includes('player.vimeo.com/') || url.includes('vimeo.com/')) return 'vimeo';
  if (url.includes('player.bilibili.com/') || url.includes('bilibili.com/')) return 'bilibili';
  if (url.endsWith('.m3u8') || url.includes('.m3u8')) return 'hls';
  if (url.includes('archive.org/') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogv')) return 'direct';
  return 'embed';
}

/* ─── Play/Pause Center Animation ─── */

function PlayPauseOverlay({ trigger }: { trigger: number }) {
  // trigger changes on play/pause toggle
  const [show, setShow] = useState(false);
  const prevTrigger = useRef(trigger);

  if (trigger !== prevTrigger.current) {
    prevTrigger.current = trigger;
    // We need to show the overlay on trigger change
    // This is a render-time side effect, not an effect callback
  }

  useEffect(() => {
    if (trigger > 0) {
      setShow(true);
      const timer = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 opacity-100 scale-100 bg-black/40 backdrop-blur-sm border border-white/10">
        {/* We don't know play vs pause here without extra prop, so show generic */}
        <div className="w-4 h-4 bg-white/80 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Skip Feedback Animation ─── */

function SkipFeedback({ direction, show }: { direction: 'forward' | 'back'; show: boolean }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10 animate-pulse">
        {direction === 'back' ? (
          <>
            <SkipBack className="w-6 h-6 text-white" strokeWidth={1.5} />
            <span className="text-white text-sm font-medium">-10s</span>
          </>
        ) : (
          <>
            <SkipForward className="w-6 h-6 text-white" strokeWidth={1.5} />
            <span className="text-white text-sm font-medium">+10s</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Link-Out Card (for non-embeddable sources) ─── */

function LinkOutCard({ movie }: { movie: CinemaMovieData }) {
  const sourceName = movie.source
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="w-full min-h-[56.25vw] max-h-screen bg-[#050507] flex items-center justify-center relative overflow-hidden">
      {/* Background with blur */}
      <div className="absolute inset-0">
        <img
          src={movie.backdrop || movie.poster}
          alt=""
          className="w-full h-full object-cover opacity-20 blur-2xl scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050507] via-[#050507]/80 to-[#050507]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        {/* Quality & Source badge */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className={`text-xs font-bold px-2.5 py-1 rounded ${movie.quality === '4K' ? 'bg-[#8B5CF6] text-white' : 'bg-white/10 text-white/70'}`}>
            {movie.quality}
          </span>
          <span className="text-xs font-medium px-2.5 py-1 bg-[#8B5CF6]/10 text-[#8B5CF6] rounded border border-[#8B5CF6]/20">
            {sourceName}
          </span>
        </div>

        {/* Poster */}
        <div className="w-36 md:w-44 mx-auto mb-6">
          <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border border-white/10">
            <img
              src={movie.poster}
              alt={movie.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/images/poster-1.jpg';
              }}
            />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">{movie.title}</h1>
        <p className="text-white/50 text-sm mb-6">
          {movie.year > 0 && `${movie.year} · `}{movie.duration}
          {movie.rating > 0 && ` · ⭐ ${movie.rating}`}
        </p>

        {/* Description */}
        <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto line-clamp-3">
          {movie.description}
        </p>

        {/* CTA Button */}
        <a
          href={movie.videoUrl || movie.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-8 py-4 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold rounded-xl transition-all duration-200 shadow-lg shadow-[#8B5CF6]/30 hover:shadow-[#8B5CF6]/50 hover:scale-105 text-base"
        >
          <ExternalLink className="w-5 h-5" strokeWidth={2} />
          Watch on {sourceName}
        </a>

        <p className="text-white/20 text-xs mt-4">
          Free · Ad-supported streaming
        </p>

        {/* Back link */}
        <Link
          href="/stream"
          className="inline-flex items-center gap-2 text-white/40 hover:text-[#8B5CF6] transition-colors mt-8 text-sm"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
          Back to Streaming
        </Link>
      </div>
    </div>
  );
}

/* ─── Main CinemaPlayer Component ─── */

export default function CinemaPlayer({ movie }: CinemaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<any>(null);

  // Determine video type
  const videoType = movie.videoType || detectVideoType(movie.videoUrl);
  const isIframe = ['youtube', 'vimeo', 'bilibili', 'embed'].includes(videoType);
  const isDirect = videoType === 'direct';
  const isHLS = videoType === 'hls';
  const isLinkOut = videoType === 'linkout';

  // Player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPauseTrigger, setPlayPauseTrigger] = useState<number>(0);
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

  // Skip feedback
  const [skipFeedback, setSkipFeedback] = useState<{ direction: 'forward' | 'back'; show: boolean }>({ direction: 'forward', show: false });

  // Menu states
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Settings
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState('auto');
  const [currentQualityLabel, setCurrentQualityLabel] = useState('Auto');

  // Seek preview
  const [seekPreview, setSeekPreview] = useState<{ time: number; x: number } | null>(null);

  // Close all menus
  const closeAllMenus = useCallback(() => {
    setShowSpeedMenu(false);
    setShowQualityMenu(false);
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
    }, CONTROLS_HIDE_DELAY);
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

  // PiP toggle
  const togglePiP = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported:', err);
    }
  }, []);

  // Skip ±10s
  const skip = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    setSkipFeedback({ direction: seconds > 0 ? 'forward' : 'back', show: true });
    setTimeout(() => setSkipFeedback(prev => ({ ...prev, show: false })), 600);
    showControls();
  }, [showControls]);

  // Keyboard shortcuts
  useEffect(() => {
    if (isIframe || isLinkOut) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          if (video.paused) { video.play(); setIsPlaying(true); setPlayPauseTrigger(Date.now()); }
          else { video.pause(); setIsPlaying(false); setPlayPauseTrigger(Date.now()); }
          showControls();
          break;
        case 'arrowleft':
          e.preventDefault();
          skip(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skip(10);
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
        case 'p':
          togglePiP();
          showControls();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, toggleFullscreen, togglePiP, isIframe, isLinkOut, skip]);

  // HLS initialization
  useEffect(() => {
    if (!isHLS) return;
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = movie.manifestUrl || movie.videoUrl;
    if (!hlsUrl) return;

    // Dynamic import of hls.js
    let hls: any = null;
    import('hls.js').then((HlsModule) => {
      const HlsConstructor = HlsModule.default;
      if (HlsConstructor.isSupported()) {
        hls = new HlsConstructor({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(HlsConstructor.Events.MANIFEST_PARSED, () => {
          video.muted = true;
          video.play().then(() => {
            setIsPlaying(true);
            setIsLoading(false);
          }).catch(() => {
            setIsLoading(false);
          });
        });
        hls.on(HlsConstructor.Events.LEVEL_LOADED, (_event: any, _data: any) => {
          const levels = hls.levels;
          if (levels && levels.length > 0) {
            const topQuality = levels[levels.length - 1];
            if (topQuality.height >= 2160) setCurrentQualityLabel('4K');
            else if (topQuality.height >= 1080) setCurrentQualityLabel('1080p');
            else if (topQuality.height >= 720) setCurrentQualityLabel('720p');
            else setCurrentQualityLabel('480p');
          }
        });
        hlsRef.current = hls;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = hlsUrl;
        video.muted = true;
        video.play().catch(() => {});
      }
    });

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [isHLS, movie.manifestUrl, movie.videoUrl]);

  // Video event handlers
  useEffect(() => {
    if (isIframe || isLinkOut) return;
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
    const onPlaying = () => { setIsLoading(false); setIsPlaying(true); };
    const onPlay = () => { setIsPlaying(true); setPlayPauseTrigger(Date.now()); };
    const onPause = () => { setIsPlaying(false); setPlayPauseTrigger(Date.now()); };
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
  }, [isIframe, isLinkOut]);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-play on mount for direct/HLS videos
  useEffect(() => {
    if (isIframe || isLinkOut) {
      setIsLoading(false);
      setIsPlaying(true);
      return;
    }
    if (!isDirect && !isHLS) return; // HLS handles its own autoplay
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
  }, [isDirect, isHLS, isIframe, isLinkOut]);

  // Play/Pause
  const togglePlay = () => {
    if (isIframe) return;
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { video.play(); setIsPlaying(true); }
    else { video.pause(); setIsPlaying(false); }
    setPlayPauseTrigger(Date.now());
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

  // Quality
  const handleQualityChange = (quality: string) => {
    if (hlsRef.current) {
      const levels = hlsRef.current.levels;
      if (quality === 'auto') {
        hlsRef.current.currentLevel = -1;
        setCurrentQualityLabel('Auto');
      } else {
        const heightMap: Record<string, number> = { '4K': 2160, '1080p': 1080, '720p': 720, '480p': 480 };
        const targetHeight = heightMap[quality] || 0;
        const levelIndex = levels?.findIndex((l: any) => l.height === targetHeight);
        if (levelIndex >= 0) {
          hlsRef.current.currentLevel = levelIndex;
          setCurrentQualityLabel(quality);
        }
      }
    }
    setSelectedQuality(quality);
    setShowQualityMenu(false);
  };

  // Volume icon
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Source label
  const sourceBadge = videoType === 'youtube' ? 'YouTube' :
    videoType === 'vimeo' ? 'Vimeo' :
    videoType === 'bilibili' ? 'Bilibili' :
    videoType === 'embed' ? 'External' :
    videoType === 'hls' ? 'HLS' :
    videoType === 'linkout' ? 'Link-out' :
    videoType === 'direct' ? 'Direct' : 'Video';

  // Get the embed URL for iframe types
  const getEmbedUrl = () => {
    if (videoType === 'youtube') {
      const videoId = movie.videoUrl.includes('/embed/')
        ? movie.videoUrl.split('/embed/')[1]?.split('?')[0]
        : movie.videoUrl.includes('watch?v=')
        ? movie.videoUrl.split('watch?v=')[1]?.split('&')[0]
        : '';
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
    }
    if (videoType === 'vimeo') {
      const vimeoId = movie.videoUrl.includes('/video/')
        ? movie.videoUrl.split('/video/')[1]?.split('?')[0]
        : movie.videoUrl.split('/').pop()?.split('?')[0] || '';
      return `https://player.vimeo.com/video/${vimeoId}?autoplay=1&byline=0&portrait=0`;
    }
    if (videoType === 'bilibili') {
      return movie.embedUrl || movie.videoUrl;
    }
    return movie.embedUrl || movie.videoUrl;
  };

  // ─── Link-out mode ───
  if (isLinkOut) {
    return <LinkOutCard movie={movie} />;
  }

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
        .cinema-cursor-hidden { cursor: none !important; }
        .cinema-cursor-hidden * { cursor: none !important; }
      `}</style>

      {/* ─── Iframe Player (YouTube / Vimeo / Bilibili / Embed) ─── */}
      {isIframe && (
        <iframe
          src={getEmbedUrl()}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          title={movie.title}
        />
      )}

      {/* ─── HLS Video Player ─── */}
      {isHLS && (
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted
          preload="metadata"
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
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

      {/* Loading spinner (direct/HLS video only) */}
      {(isDirect || isHLS) && isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-14 h-14 border-[3px] border-[#8B5CF6]/30 border-t-[#8B5CF6] rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause center animation */}
      {(isDirect || isHLS) && (
        <PlayPauseOverlay trigger={playPauseTrigger} />
      )}

      {/* Skip feedback */}
      {(isDirect || isHLS) && (
        <SkipFeedback direction={skipFeedback.direction} show={skipFeedback.show} />
      )}

      {/* ─── Controls Overlay (direct/HLS video) ─── */}
      {(isDirect || isHLS) && (
        <div
          className={`absolute inset-0 z-20 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'} ${!cursorVisible ? 'cinema-cursor-hidden' : ''}`}
        >
          {/* Top gradient */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/80 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 md:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link
                href="/stream"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors min-h-[44px] min-w-[44px] items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <h2 className="text-white text-sm md:text-base font-semibold line-clamp-1">{movie.title}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-white/50 text-xs">{movie.year} · {movie.duration}</p>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded border border-[#8B5CF6]/20">
                    {sourceBadge}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language indicator */}
              {movie.languages.length > 1 && (
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Globe className="w-3 h-3" strokeWidth={1.5} />
                  {movie.languages.length} lang
                </span>
              )}
              {/* Subtitle indicator */}
              {movie.subtitles.length > 0 && (
                <span className="text-[10px] text-white/40 flex items-center gap-1">
                  <Subtitles className="w-3 h-3" strokeWidth={1.5} />
                  CC
                </span>
              )}
            </div>
          </div>

          {/* Center play button (when paused) */}
          {!isPlaying && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlay}
                className="w-20 h-20 md:w-24 md:h-24 bg-[#8B5CF6]/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#8B5CF6]/30 transition-all duration-200 border border-[#8B5CF6]/20 hover:scale-110 group"
                aria-label="Play"
              >
                <Play className="w-10 h-10 md:w-12 md:h-12 text-[#8B5CF6] fill-[#8B5CF6] ml-1 group-hover:text-white group-hover:fill-white transition-colors" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 px-4 md:px-8 pb-4">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="group/progress relative h-1 hover:h-2.5 transition-all duration-150 cursor-pointer mb-3 rounded-full"
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setSeekPreview(null)}
            >
              <div className="absolute inset-0 bg-white/20 rounded-full" />
              {/* Buffer progress */}
              <div
                className="absolute top-0 left-0 h-full bg-white/20 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              {/* Play progress */}
              <div
                className="absolute top-0 left-0 h-full bg-[#8B5CF6] rounded-full transition-[width] duration-100"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              {/* Progress dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#8B5CF6] rounded-full shadow-lg shadow-[#8B5CF6]/40 opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 7px)` : '-7px' }}
              />
              {/* Seek preview tooltip */}
              {seekPreview && duration > 0 && (
                <div
                  className="absolute -top-9 bg-black/90 backdrop-blur-sm text-white text-xs px-2.5 py-1.5 rounded-lg pointer-events-none border border-white/10"
                  style={{ left: `${seekPreview.x}px`, transform: 'translateX(-50%)' }}
                >
                  {formatTime(seekPreview.time)}
                </div>
              )}
            </div>

            {/* Control buttons row */}
            <div className="flex items-center justify-between gap-2">
              {/* Left controls */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="text-white hover:text-[#8B5CF6] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                </button>

                {/* Skip Back */}
                <button onClick={() => skip(-10)} className="text-white/80 hover:text-[#8B5CF6] transition-colors hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Skip back 10s">
                  <SkipBack className="w-4 h-4" strokeWidth={1.5} />
                </button>
                {/* Skip Forward */}
                <button onClick={() => skip(10)} className="text-white/80 hover:text-[#8B5CF6] transition-colors hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center" aria-label="Skip forward 10s">
                  <SkipForward className="w-4 h-4" strokeWidth={1.5} />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-1 group/vol">
                  <button onClick={toggleMute} className="text-white/80 hover:text-[#8B5CF6] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label={isMuted ? 'Unmute' : 'Mute'}>
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
                      className="w-20 h-1 accent-[#8B5CF6] cursor-pointer"
                      aria-label="Volume"
                    />
                  </div>
                </div>

                {/* Time */}
                <div className="text-white/70 text-xs font-mono hidden sm:block ml-1">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-0.5 md:gap-1">
                {/* Quality badge */}
                {isHLS && (
                  <div className="relative">
                    <button
                      onClick={() => { closeAllMenus(); setShowQualityMenu(!showQualityMenu); }}
                      className="text-[10px] px-1.5 py-0.5 rounded transition-colors text-white/70 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 min-h-[32px] flex items-center"
                      aria-label="Quality"
                    >
                      {currentQualityLabel}
                    </button>
                    {/* Quality Menu */}
                    {showQualityMenu && (
                      <div className="absolute bottom-10 right-0 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[140px] z-30 shadow-xl">
                        <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28] flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                          Quality
                        </div>
                        {QUALITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleQualityChange(opt.value)}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedQuality === opt.value ? 'text-[#8B5CF6] bg-[#8B5CF6]/10' : 'text-white/80 hover:bg-[#111118]'}`}
                          >
                            <span>{opt.label}</span>
                            {selectedQuality === opt.value && <Check className="w-4 h-4" strokeWidth={2} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Speed */}
                <div className="relative">
                  <button
                    onClick={() => { closeAllMenus(); setShowSpeedMenu(!showSpeedMenu); }}
                    className={`text-[11px] px-1.5 py-0.5 rounded transition-colors min-h-[32px] flex items-center ${selectedSpeed !== 1 ? 'text-[#8B5CF6] bg-[#8B5CF6]/10' : 'text-white/70 hover:text-[#8B5CF6]'}`}
                    aria-label="Playback speed"
                  >
                    {selectedSpeed === 1 ? '1x' : `${selectedSpeed}x`}
                  </button>
                  {/* Speed Menu */}
                  {showSpeedMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[140px] z-30 shadow-xl">
                      <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28]">Speed</div>
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedSpeed === speed ? 'text-[#8B5CF6] bg-[#8B5CF6]/10' : 'text-white/80 hover:bg-[#111118]'}`}
                        >
                          <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                          {selectedSpeed === speed && <Check className="w-4 h-4" strokeWidth={2} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* PiP */}
                <button onClick={togglePiP} className="text-white/70 hover:text-[#8B5CF6] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" aria-label="Picture in Picture">
                  <PictureInPicture2 className="w-4 h-4" strokeWidth={1.5} />
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-white/80 hover:text-[#8B5CF6] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                  {isFullscreen ? <Minimize className="w-5 h-5" strokeWidth={1.5} /> : <Maximize className="w-5 h-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Iframe Controls Overlay (simplified top bar) ─── */}
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
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors min-h-[44px]"
                onClick={(e) => e.stopPropagation()}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <h2 className="text-white text-sm md:text-base font-semibold line-clamp-1">{movie.title}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-white/50 text-xs">{movie.year} · {movie.duration}</p>
                  <span className="text-[9px] font-medium px-1.5 py-0.5 bg-[#8B5CF6]/20 text-[#8B5CF6] rounded border border-[#8B5CF6]/20">
                    {sourceBadge}
                  </span>
                </div>
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
                  className="text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Open original source"
                >
                  <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini progress bar (always visible for direct/HLS video) */}
      {(isDirect || isHLS) && !controlsVisible && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10 bg-white/10 pointer-events-none">
          <div
            className="h-full bg-[#8B5CF6]"
            style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
          />
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      {(isDirect || isHLS) && (
        <div className="absolute bottom-16 left-4 z-10 pointer-events-none opacity-0" id="cinema-shortcuts-hint">
          <div className="text-[10px] text-white/30 space-y-0.5">
            <p>Space: Play/Pause · ←→: Seek 10s · ↑↓: Volume</p>
            <p>M: Mute · F: Fullscreen · P: PiP</p>
          </div>
        </div>
      )}
    </div>
  );
}
