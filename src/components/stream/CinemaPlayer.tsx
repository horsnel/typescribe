'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, SkipBack, SkipForward,
  Settings, ChevronLeft, Subtitles, Globe,
  X, Check, PictureInPicture2,
  ChevronUp, Film, Loader2, Sparkles, Info
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

function PlayPauseOverlay({ trigger, playing }: { trigger: number; playing: boolean }) {
  // trigger changes on play/pause toggle
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger > 0) {
      // Briefly show the play/pause overlay when `trigger` changes. The
      // setState-in-effect is intentional — we need to flip the visibility
      // bit on when the trigger prop changes, then auto-hide via setTimeout.
       
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state with external system on mount
      setShow(true);
      const timer = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
      <div className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 opacity-100 scale-100 bg-[#D4A853]/15 backdrop-blur-md border border-[#D4A853]/30 shadow-[0_0_44px_rgba(212,168,83,0.35)]">
        {playing
          ? <Pause className="w-8 h-8 text-[#D4A853]" fill="currentColor" strokeWidth={1.5} />
          : <Play className="w-8 h-8 text-[#D4A853] fill-[#D4A853] ml-1" strokeWidth={1.5} />}
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

/* ─── Unavailable Card (for non-embeddable sources — internal only, never links out) ─── */

function LinkOutCard({ movie }: { movie: CinemaMovieData }) {
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
      <div className="relative z-10 max-w-2xl mx-auto px-8 text-center">
        {/* Quality badge */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className={`text-xs font-bold px-3 py-1.5 rounded ${movie.quality === '4K' ? 'bg-[#D4A853] text-white' : 'bg-white/10 text-white/70'}`}>
            {movie.quality}
          </span>
        </div>

        {/* Poster */}
        <div className="w-36 md:w-44 mx-auto mb-8">
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
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-3">{movie.title}</h1>
        <p className="text-white/50 text-sm mb-8">
          {movie.year > 0 && `${movie.year} · `}{movie.duration}
          {movie.rating > 0 && ` · ⭐ ${movie.rating}`}
        </p>

        {/* Description */}
        <p className="text-white/60 text-sm md:text-base leading-relaxed mb-8 max-w-lg mx-auto line-clamp-3">
          {movie.description}
        </p>

        {/* Availability note — internal only, no external links */}
        <div className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white/70 text-sm">
          <Info className="w-4 h-4 text-[#D4A853] shrink-0" strokeWidth={1.5} />
          This title isn&apos;t playable in the player right now
        </div>

        {/* Back link (internal) */}
        <div className="mt-10">
          <Link
            href="/stream"
            className="inline-flex items-center gap-2 text-white/50 hover:text-[#D4A853] transition-colors text-sm font-medium"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            Browse more titles
          </Link>
        </div>
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
          className={`w-full h-full object-contain transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${!isPlaying && !isLoading ? 'blur-xl brightness-[0.55] scale-[1.06]' : ''}`}
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
          className={`w-full h-full object-contain transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${!isPlaying && !isLoading ? 'blur-xl brightness-[0.55] scale-[1.06]' : ''}`}
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
          <div className="w-14 h-14 border-[3px] border-[#D4A853]/30 border-t-[#D4A853] rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause center animation */}
      {(isDirect || isHLS) && (
        <PlayPauseOverlay trigger={playPauseTrigger} playing={isPlaying} />
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
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 md:px-10 py-5">
            <div className="flex items-center gap-4 md:gap-5">
              <Link
                href="/stream"
                className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Back to catalog"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#D4A853] mb-1">Now Playing</p>
                <h2 className="text-white text-base md:text-lg font-semibold line-clamp-1 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">{movie.title}</h2>
                <p className="text-white/50 text-xs md:text-sm mt-0.5 tabular-nums">{movie.year} · {movie.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language indicator */}
              {movie.languages.length > 1 && (
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/70 bg-black/35 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Globe className="w-3 h-3" strokeWidth={1.5} />
                  {movie.languages.length} lang
                </span>
              )}
              {/* Subtitle indicator */}
              {movie.subtitles.length > 0 && (
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/70 bg-black/35 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
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
                className="w-20 h-20 md:w-24 md:h-24 bg-[#D4A853] rounded-full flex items-center justify-center hover:bg-[#E4BC6B] transition-all duration-200 shadow-[0_0_48px_rgba(212,168,83,0.5),0_4px_24px_rgba(0,0,0,0.5)] hover:scale-110 active:scale-95"
                aria-label="Play"
              >
                <Play className="w-10 h-10 md:w-12 md:h-12 text-[#0A0A0C] fill-[#0A0A0C] ml-1" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Bottom gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none" />

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 right-0 px-5 md:px-10 pb-5 md:pb-6">
            {/* Progress bar */}
            <div
              ref={progressRef}
              className="group/progress relative h-1.5 hover:h-3 transition-all duration-150 cursor-pointer mb-4 rounded-full"
              onClick={handleProgressClick}
              onMouseMove={handleProgressHover}
              onMouseLeave={() => setSeekPreview(null)}
            >
              <div className="absolute inset-0 bg-white/15 rounded-full" />
              {/* Buffer progress */}
              <div
                className="absolute top-0 left-0 h-full bg-white/25 rounded-full"
                style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
              />
              {/* Play progress — gold fill with HUSH glow */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#A97B2F] to-[#D4A853] rounded-full shadow-[0_0_12px_rgba(212,168,83,0.55)] transition-[width] duration-100"
                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
              />
              {/* Progress dot */}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#D4A853] rounded-full shadow-[0_0_0_4px_rgba(212,168,83,0.25),0_0_16px_rgba(212,168,83,0.55)] opacity-0 group-hover/progress:opacity-100 transition-opacity"
                style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 8px)` : '-8px' }}
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
            <div className="flex items-center justify-between gap-3">
              {/* Left controls */}
              <div className="flex items-center gap-1.5 md:gap-3">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
                </button>

                {/* Skip Back */}
                <button onClick={() => skip(-10)} className="hidden sm:flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/90 hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label="Skip back 10s">
                  <SkipBack className="w-5 h-5" strokeWidth={1.5} />
                </button>
                {/* Skip Forward */}
                <button onClick={() => skip(10)} className="hidden sm:flex min-h-[44px] min-w-[44px] h-11 w-11 items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/90 hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label="Skip forward 10s">
                  <SkipForward className="w-5 h-5" strokeWidth={1.5} />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-1 group/vol">
                  <button onClick={toggleMute} className="min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/90 hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label={isMuted ? 'Unmute' : 'Mute'}>
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

                {/* Time */}
                <div className="text-white/70 text-sm font-mono hidden sm:block ml-2 tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-1 md:gap-2">
                {/* Quality badge */}
                {isHLS && (
                  <div className="relative">
                    <button
                      onClick={() => { closeAllMenus(); setShowQualityMenu(!showQualityMenu); }}
                      className="text-[10px] px-1.5 py-0.5 rounded transition-colors text-white/70 hover:text-[#D4A853] hover:bg-[#D4A853]/10 min-h-[32px] flex items-center"
                      aria-label="Quality"
                    >
                      {currentQualityLabel}
                    </button>
                    {/* Quality Menu */}
                    {showQualityMenu && (
                      <div className="absolute bottom-10 right-0 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/10 rounded-xl py-2 min-w-[140px] z-30 shadow-xl">
                        <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28] flex items-center gap-1.5">
                          <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                          Quality
                        </div>
                        {QUALITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => handleQualityChange(opt.value)}
                            className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedQuality === opt.value ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
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
                    className={`text-[11px] px-1.5 py-0.5 rounded transition-colors min-h-[32px] flex items-center ${selectedSpeed !== 1 ? 'text-[#D4A853] bg-[#D4A853]/10' : 'text-white/70 hover:text-[#D4A853]'}`}
                    aria-label="Playback speed"
                  >
                    {selectedSpeed === 1 ? '1x' : `${selectedSpeed}x`}
                  </button>
                  {/* Speed Menu */}
                  {showSpeedMenu && (
                    <div className="absolute bottom-10 right-0 bg-[#0c0c10]/95 backdrop-blur-xl border border-white/10 rounded-xl py-2 min-w-[140px] z-30 shadow-xl">
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

                {/* PiP */}
                <button onClick={togglePiP} className="min-h-[36px] min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/80 hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label="Picture in Picture">
                  <PictureInPicture2 className="w-4 h-4" strokeWidth={1.5} />
                </button>

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="min-h-[36px] min-w-[36px] h-9 w-9 flex items-center justify-center rounded-full bg-black/35 backdrop-blur-md border border-white/10 text-white/80 hover:text-[#D4A853] hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
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
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none" />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 md:px-10 py-5 pointer-events-auto">
            <div className="flex items-center gap-4 md:gap-5">
              <Link
                href="/stream"
                className="w-11 h-11 rounded-full bg-black/35 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/90 hover:text-white hover:border-[#D4A853]/45 hover:bg-black/55 active:scale-90 transition-all flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="Back to catalog"
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={1.5} />
              </Link>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-[#D4A853] mb-1">Now Playing</p>
                <h2 className="text-white text-base md:text-lg font-semibold line-clamp-1 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)]">{movie.title}</h2>
                <p className="text-white/50 text-xs md:text-sm mt-0.5 tabular-nums">{movie.year} · {movie.duration}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {movie.languages.length > 1 && (
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/70 bg-black/35 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Globe className="w-3 h-3" strokeWidth={1.5} />
                  {movie.languages.length} lang
                </span>
              )}
              {movie.subtitles.length > 0 && (
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-white/70 bg-black/35 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <Subtitles className="w-3 h-3" strokeWidth={1.5} />
                  CC
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mini progress bar (always visible for direct/HLS video) */}
      {(isDirect || isHLS) && !controlsVisible && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] z-10 bg-white/10 pointer-events-none">
          <div
            className="h-full bg-[#D4A853] shadow-[0_0_8px_rgba(212,168,83,0.6)]"
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
