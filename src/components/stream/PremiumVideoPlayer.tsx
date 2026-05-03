'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Play, Pause, Volume2, VolumeX, Volume1,
  Maximize, Minimize, SkipBack, SkipForward,
  Settings, ChevronLeft, Subtitles, Globe,
  Clock, Gauge, X, Check, ChevronUp
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
  languages: string[];
  subtitles: string[];
}

interface PremiumVideoPlayerProps {
  movie: MovieData;
}

/* ─── Constants ─── */

const QUALITY_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '4K (2160p)', value: '2160p' },
  { label: '1440p', value: '1440p' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: '480p', value: '480p' },
  { label: '360p', value: '360p' },
];

const SUBTITLE_OPTIONS = [
  'Off', 'English', 'Spanish', 'French', 'German', 'Japanese',
  'Chinese (Simplified)', 'Chinese (Traditional)', 'Korean', 'Portuguese', 'Arabic', 'Hindi',
];

const AUDIO_LANGUAGES = [
  { label: 'English (Original)', value: 'en-original', isOriginal: true, isDubbed: false },
  { label: 'English (Dubbed)', value: 'en-dubbed', isOriginal: false, isDubbed: true },
  { label: 'Spanish', value: 'es', isOriginal: false, isDubbed: true },
  { label: 'French', value: 'fr', isOriginal: false, isDubbed: true },
  { label: 'German', value: 'de', isOriginal: false, isDubbed: true },
  { label: 'Japanese', value: 'ja', isOriginal: false, isDubbed: true },
  { label: 'Korean', value: 'ko', isOriginal: false, isDubbed: true },
  { label: 'Chinese (Mandarin)', value: 'zh', isOriginal: false, isDubbed: true },
  { label: 'Portuguese', value: 'pt', isOriginal: false, isDubbed: true },
  { label: 'Arabic', value: 'ar', isOriginal: false, isDubbed: true },
  { label: 'Hindi', value: 'hi', isOriginal: false, isDubbed: true },
];

const DUB_LANGUAGES = [
  { label: 'Spanish', value: 'es', flag: '🇪🇸', quality: 'HD', audio: '5.1 Surround' },
  { label: 'French', value: 'fr', flag: '🇫🇷', quality: 'HD', audio: '5.1 Surround' },
  { label: 'German', value: 'de', flag: '🇩🇪', quality: 'HD', audio: '5.1 Surround' },
  { label: 'Japanese', value: 'ja', flag: '🇯🇵', quality: 'HD', audio: 'Stereo' },
  { label: 'Korean', value: 'ko', flag: '🇰🇷', quality: 'HD', audio: '5.1 Surround' },
  { label: 'Chinese (Mandarin)', value: 'zh', flag: '🇨🇳', quality: 'HD', audio: 'Stereo' },
  { label: 'Portuguese', value: 'pt', flag: '🇧🇷', quality: 'HD', audio: '5.1 Surround' },
  { label: 'Arabic', value: 'ar', flag: '🇸🇦', quality: 'HD', audio: 'Stereo' },
  { label: 'Hindi', value: 'hi', flag: '🇮🇳', quality: 'HD', audio: '5.1 Surround' },
];

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

/* ─── Component ─── */

export default function PremiumVideoPlayer({ movie }: PremiumVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

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
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showDubPanel, setShowDubPanel] = useState(false);

  // Settings
  const [selectedQuality, setSelectedQuality] = useState('2160p');
  const [selectedSubtitle, setSelectedSubtitle] = useState('Off');
  const [selectedAudio, setSelectedAudio] = useState('en-original');
  const [selectedSpeed, setSelectedSpeed] = useState(1);
  const [selectedDub, setSelectedDub] = useState<string | null>(null);

  // Skip intro
  const [showSkipIntro, setShowSkipIntro] = useState(true);

  // Seek preview
  const [seekPreview, setSeekPreview] = useState<{ time: number; x: number } | null>(null);

  // Close all menus
  const closeAllMenus = useCallback(() => {
    setShowQualityMenu(false);
    setShowSubtitleMenu(false);
    setShowAudioMenu(false);
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

  // Fullscreen toggle (defined early so keyboard effect can reference it)
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
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;
      // Don't capture if user is in an input
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
        case 's':
          setShowSubtitleMenu(prev => !prev);
          showControls();
          break;
        case 'l':
          setShowAudioMenu(prev => !prev);
          showControls();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showControls, toggleFullscreen]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onDurationChange = () => setDuration(video.duration);
    const onLoadedData = () => setIsLoading(false);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, []);

  // Fullscreen change detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Auto-hide skip intro after 30s
  useEffect(() => {
    const t = setTimeout(() => setShowSkipIntro(false), 30000);
    return () => clearTimeout(t);
  }, []);

  // Play/Pause
  const togglePlay = () => {
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
    if (!video) return;
    video.playbackRate = speed;
    setSelectedSpeed(speed);
    setShowSpeedMenu(false);
  };

  // Volume icon
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  // Active audio label
  const activeAudio = AUDIO_LANGUAGES.find(a => a.value === selectedAudio);
  const activeDub = DUB_LANGUAGES.find(d => d.value === selectedDub);

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
      {/* Video Element */}
      <video
        ref={videoRef}
        src={movie.videoUrl}
        className="w-full h-full object-contain"
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Cursor style */}
      <style>{`
        .player-cursor-hidden { cursor: none !important; }
        .player-cursor-hidden * { cursor: none !important; }
      `}</style>

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 border-3 border-[#d4a853]/30 border-t-[#d4a853] rounded-full animate-spin" />
        </div>
      )}

      {/* Subtitle overlay */}
      {selectedSubtitle !== 'Off' && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="text-white text-lg md:text-xl bg-black/75 px-4 py-2 rounded-lg whitespace-nowrap">
            Sample subtitle text ({selectedSubtitle})
          </span>
        </div>
      )}

      {/* Source credits watermark */}
      <div className="absolute bottom-3 right-4 z-10 pointer-events-none opacity-40">
        <span className="text-[10px] text-white/70">Source: {movie.source}</span>
      </div>

      {/* Skip Intro Button */}
      {showSkipIntro && currentTime < 30 && (
        <div className="absolute bottom-28 right-6 z-30">
          <button
            onClick={() => {
              const video = videoRef.current;
              if (video) video.currentTime = Math.min(30, video.duration * 0.05);
              setShowSkipIntro(false);
            }}
            className="px-5 py-2 bg-[#0c0c10]/80 border border-[#1e1e28] text-white text-sm font-medium rounded hover:bg-[#111118] transition-colors backdrop-blur-sm"
          >
            Skip Intro
          </button>
        </div>
      )}

      {/* Controls Overlay */}
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

          {/* 4K badge when applicable */}
          {selectedQuality === '2160p' && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-[#d4a853] text-black text-[10px] font-bold rounded">4K</span>
              <span className="hidden sm:inline text-[10px] text-[#d4a853] font-medium">Ultra HD</span>
            </div>
          )}
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
            {/* Background */}
            <div className="absolute inset-0 bg-white/20 rounded-full" />

            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
              style={{ width: duration ? `${(buffered / duration) * 100}%` : '0%' }}
            />

            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-[#d4a853] rounded-full"
              style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />

            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#d4a853] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
              style={{ left: duration ? `calc(${(currentTime / duration) * 100}% - 7px)` : '-7px' }}
            />

            {/* Seek preview tooltip */}
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
              {/* Play/Pause */}
              <button onClick={togglePlay} className="text-white hover:text-[#d4a853] transition-colors" aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5" fill="currentColor" />}
              </button>

              {/* Skip back/forward */}
              <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, v.currentTime - 10); }} className="text-white/80 hover:text-[#d4a853] transition-colors hidden sm:block" aria-label="Skip back 10s">
                <SkipBack className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <button onClick={() => { const v = videoRef.current; if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); }} className="text-white/80 hover:text-[#d4a853] transition-colors hidden sm:block" aria-label="Skip forward 10s">
                <SkipForward className="w-4 h-4" strokeWidth={1.5} />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button onClick={toggleMute} className="text-white/80 hover:text-[#d4a853] transition-colors" aria-label={isMuted ? 'Unmute' : 'Mute'}>
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
                    className="w-20 h-1 accent-[#d4a853] cursor-pointer"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="text-white/70 text-xs font-mono hidden sm:block">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Dub button */}
              <button
                onClick={() => { closeAllMenus(); setShowDubPanel(!showDubPanel); }}
                className={`text-xs px-2 py-1 rounded transition-colors ${showDubPanel ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:text-[#d4a853]'} ${selectedDub ? 'border border-[#d4a853]/30' : ''}`}
                aria-label="Dubbed versions"
              >
                DUB
              </button>

              {/* Subtitle button */}
              <button
                onClick={() => { closeAllMenus(); setShowSubtitleMenu(!showSubtitleMenu); }}
                className={`transition-colors ${selectedSubtitle !== 'Off' ? 'text-[#d4a853]' : 'text-white/80 hover:text-[#d4a853]'}`}
                aria-label="Subtitles"
              >
                <Subtitles className="w-5 h-5" strokeWidth={1.5} />
              </button>

              {/* Audio language button */}
              <button
                onClick={() => { closeAllMenus(); setShowAudioMenu(!showAudioMenu); }}
                className={`transition-colors ${showAudioMenu ? 'text-[#d4a853]' : 'text-white/80 hover:text-[#d4a853]'}`}
                aria-label="Audio language"
              >
                <Globe className="w-5 h-5" strokeWidth={1.5} />
              </button>

              {/* Speed */}
              <div className="relative">
                <button
                  onClick={() => { closeAllMenus(); setShowSpeedMenu(!showSpeedMenu); }}
                  className={`text-xs px-1.5 py-0.5 rounded transition-colors ${selectedSpeed !== 1 ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:text-[#d4a853]'}`}
                  aria-label="Playback speed"
                >
                  {selectedSpeed === 1 ? '1x' : `${selectedSpeed}x`}
                </button>
              </div>

              {/* Quality */}
              <div className="relative">
                <button
                  onClick={() => { closeAllMenus(); setShowQualityMenu(!showQualityMenu); }}
                  className="flex items-center gap-1 text-white/80 hover:text-[#d4a853] transition-colors"
                  aria-label="Quality"
                >
                  <Settings className="w-5 h-5" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold text-[#d4a853]">{selectedQuality === '2160p' ? '4K' : selectedQuality === 'auto' ? 'Auto' : selectedQuality.replace('p', '')}</span>
                </button>
              </div>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="text-white/80 hover:text-[#d4a853] transition-colors" aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <Minimize className="w-5 h-5" strokeWidth={1.5} /> : <Maximize className="w-5 h-5" strokeWidth={1.5} />}
              </button>
            </div>
          </div>

          {/* Active track info */}
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
            {selectedSubtitle !== 'Off' && <span>CC: {selectedSubtitle}</span>}
            {activeAudio && <span>Audio: {activeAudio.label}</span>}
            {activeDub && <span className="text-[#d4a853]/60">Dub: {activeDub.label}</span>}
          </div>
        </div>

        {/* ─── Popup Menus ─── */}

        {/* Quality Menu */}
        {showQualityMenu && (
          <div className="absolute bottom-24 right-12 md:right-20 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[180px] z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28]">Quality</div>
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.value}
                onClick={() => { setSelectedQuality(q.value); setShowQualityMenu(false); }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedQuality === q.value ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
              >
                <span>{q.label}</span>
                {selectedQuality === q.value && <Check className="w-4 h-4" strokeWidth={2} />}
              </button>
            ))}
            {selectedQuality === '2160p' && (
              <div className="mx-3 mt-2 mb-1 p-2 bg-[#d4a853]/10 border border-[#d4a853]/20 rounded-lg">
                <p className="text-[10px] text-[#d4a853] font-medium">Streaming in 4K Ultra HD</p>
              </div>
            )}
          </div>
        )}

        {/* Subtitle Menu */}
        {showSubtitleMenu && (
          <div className="absolute bottom-24 right-12 md:right-20 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[200px] z-30 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 scrollbar-thin">
            <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28] sticky top-0 bg-[#0c0c10]">Subtitles</div>
            {SUBTITLE_OPTIONS.map((sub) => (
              <button
                key={sub}
                onClick={() => { setSelectedSubtitle(sub); setShowSubtitleMenu(false); }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedSubtitle === sub ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
              >
                <span>{sub}</span>
                {selectedSubtitle === sub && <Check className="w-4 h-4" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}

        {/* Audio Language Menu */}
        {showAudioMenu && (
          <div className="absolute bottom-24 right-12 md:right-20 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[220px] z-30 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-200 scrollbar-thin">
            <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28] sticky top-0 bg-[#0c0c10]">Audio Language</div>
            {AUDIO_LANGUAGES.map((audio) => (
              <button
                key={audio.value}
                onClick={() => { setSelectedAudio(audio.value); setShowAudioMenu(false); }}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedAudio === audio.value ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
              >
                <div className="flex items-center gap-2">
                  <span>{audio.label}</span>
                  {audio.isOriginal && <span className="text-[9px] px-1.5 py-0.5 bg-[#d4a853]/20 text-[#d4a853] rounded font-medium">Original</span>}
                  {audio.isDubbed && <span className="text-[9px] px-1.5 py-0.5 bg-white/10 text-white/50 rounded font-medium">Dubbed</span>}
                </div>
                {selectedAudio === audio.value && <Check className="w-4 h-4" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}

        {/* Speed Menu */}
        {showSpeedMenu && (
          <div className="absolute bottom-24 right-12 md:right-20 bg-[#0c0c10]/95 backdrop-blur-md border border-[#1e1e28] rounded-xl py-2 min-w-[140px] z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="px-3 py-1.5 text-xs text-white/50 font-medium border-b border-[#1e1e28]">Speed</div>
            {SPEED_OPTIONS.map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`flex items-center justify-between w-full px-3 py-2 text-sm transition-colors ${selectedSpeed === speed ? 'text-[#d4a853] bg-[#d4a853]/10' : 'text-white/80 hover:bg-[#111118]'}`}
              >
                <span>{speed === 1 ? 'Normal' : `${speed}x`}</span>
                {selectedSpeed === speed && <Check className="w-4 h-4" strokeWidth={2} />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dub Panel - slides up from bottom */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${showDubPanel ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="bg-[#0c0c10]/98 backdrop-blur-xl border-t border-[#1e1e28] rounded-t-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Dubbed Versions</h3>
              <p className="text-white/40 text-xs mt-0.5">Select a dubbed audio track</p>
            </div>
            <button onClick={() => setShowDubPanel(false)} className="text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {DUB_LANGUAGES.map((dub) => (
              <button
                key={dub.value}
                onClick={() => { setSelectedDub(dub.value === selectedDub ? null : dub.value); }}
                className={`p-3 rounded-xl border transition-all text-left ${
                  selectedDub === dub.value
                    ? 'bg-[#d4a853]/10 border-[#d4a853]/30 ring-1 ring-[#d4a853]/20'
                    : 'bg-[#050507] border-[#1e1e28] hover:bg-[#111118] hover:border-[#2a2a35]'
                }`}
              >
                <div className="text-2xl mb-1">{dub.flag}</div>
                <div className={`text-sm font-medium ${selectedDub === dub.value ? 'text-[#d4a853]' : 'text-white/90'}`}>{dub.label}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50">{dub.quality}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/5 rounded text-white/50">{dub.audio}</span>
                </div>
                {selectedDub === dub.value && (
                  <div className="mt-2 text-[10px] text-[#d4a853] font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" strokeWidth={2} /> Active
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mini progress bar (always visible) */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 z-10 bg-white/10 pointer-events-none">
        <div
          className="h-full bg-[#d4a853]"
          style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
        />
      </div>

      {/* Keyboard shortcuts hint (briefly on mount) */}
      <div className="absolute bottom-16 left-4 z-10 pointer-events-none opacity-0" id="shortcuts-hint">
        <div className="text-[10px] text-white/30 space-y-0.5">
          <p>Space: Play/Pause · ←→: Seek 10s · ↑↓: Volume</p>
          <p>M: Mute · F: Fullscreen · S: Subtitles · L: Language</p>
        </div>
      </div>
    </div>
  );
}
