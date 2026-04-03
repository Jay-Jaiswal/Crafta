import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward } from 'lucide-react';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import Heatmap from './Heatmap';

const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:8000').replace(/\/$/, '');

const VideoPlayer = () => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const data = useStore((s) => s.data);
  const currentTime = useStore((s) => s.currentTime);
  const isPlaying = useStore((s) => s.isPlaying);
  const setCurrentTime = useStore((s) => s.setCurrentTime);
  const setIsPlaying = useStore((s) => s.setIsPlaying);
  const setVideoDuration = useStore((s) => s.setVideoDuration);
  const highlightedSegment = useStore((s) => s.highlightedSegment);
  const getScoreAtTime = useStore((s) => s.getScoreAtTime);
  const getSegmentAtTime = useStore((s) => s.getSegmentAtTime);

  const [isMuted, setIsMuted] = useState(false);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const duration = data?.video_duration || 60;
  const previewRows = data?.pipeline_preview?.slice(0, 5) || [];
  const resolvedVideoUrl = data?.video_url
    ? (data.video_url.startsWith('http://') || data.video_url.startsWith('https://')
      ? data.video_url
      : `${API_BASE}${data.video_url.startsWith('/') ? '' : '/'}${data.video_url}`)
    : null;

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [setIsPlaying]);

  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  }, [setCurrentTime]);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      setVideoDuration(video.duration);
    }
  }, [setVideoDuration]);

  const seekTo = useCallback((time) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  }, [setCurrentTime]);

  useEffect(() => {
    if (highlightedSegment && videoRef.current) {
      const video = videoRef.current;
      if (Math.abs(video.currentTime - highlightedSegment.start) > 1) {
        video.currentTime = highlightedSegment.start;
      }
    }
  }, [highlightedSegment]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !video.muted;
      setIsMuted(!video.muted);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, duration));
    }
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentScore = getScoreAtTime(currentTime);
  const currentSegment = getSegmentAtTime(currentTime);

  const scoreColor = currentScore >= 70 ? 'text-emerald-500' : currentScore >= 45 ? 'text-amber-500' : 'text-red-500';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="card overflow-hidden"
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Video Player
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentSegment && (
            <motion.span
              key={currentSegment.label}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                currentSegment.type === 'high'
                  ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                  : currentSegment.type === 'low'
                  ? isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
                  : isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
              }`}
            >
              {currentSegment.label}
            </motion.span>
          )}
          <span className={`text-sm font-semibold tabular-nums ${scoreColor}`}>
            {Math.round(currentScore)}%
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-black cursor-pointer" onClick={togglePlay}>
        {resolvedVideoUrl ? (
          <video
            ref={videoRef}
            src={resolvedVideoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="w-full h-full object-contain"
            playsInline
            preload="metadata"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-white/70">
            Video source unavailable
          </div>
        )}

        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20"
              >
                <Play className="w-6 h-6 text-white ml-0.5" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Score Badge */}
        <div className="absolute top-3 right-3">
          <div className={`px-2.5 py-1 rounded-md backdrop-blur-sm border text-xs font-semibold tabular-nums ${
            currentScore >= 70
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : currentScore >= 45
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            {Math.round(currentScore)}%
          </div>
        </div>

        {/* Drop Zone Indicators */}
        {data?.drops?.map((drop) => {
          const isActive = currentTime >= drop.start && currentTime <= drop.end;
          return isActive ? (
            <motion.div
              key={drop.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-12 left-3 right-3"
            >
              <div className="px-3 py-2 rounded-lg bg-red-500/10 backdrop-blur-sm border border-red-500/20">
                <p className="text-xs text-red-400 font-medium">
                  {drop.reason} ({drop.confidence}% confidence)
                </p>
              </div>
            </motion.div>
          ) : null;
        })}
      </div>

      {/* Heatmap Timeline */}
      <div className="px-4 pt-3">
        <Heatmap
          scores={data?.attention_scores || []}
          drops={data?.drops || []}
          duration={duration}
          currentTime={currentTime}
          onSeek={seekTo}
        />
      </div>

      {/* Controls */}
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => skip(-5)} className={`p-1 rounded transition-colors ${isDark ? 'text-surface-500 hover:text-surface-300' : 'text-surface-400 hover:text-surface-600'}`}>
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white hover:bg-brand-700 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>
          <button onClick={() => skip(5)} className={`p-1 rounded transition-colors ${isDark ? 'text-surface-500 hover:text-surface-300' : 'text-surface-400 hover:text-surface-600'}`}>
            <SkipForward className="w-4 h-4" />
          </button>

          <span className={`text-xs tabular-nums min-w-[70px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button onClick={toggleMute} className={`p-1 rounded transition-colors ${isDark ? 'text-surface-500 hover:text-surface-300' : 'text-surface-400 hover:text-surface-600'}`}>
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={toggleFullscreen} className={`p-1 rounded transition-colors ${isDark ? 'text-surface-500 hover:text-surface-300' : 'text-surface-400 hover:text-surface-600'}`}>
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pipeline Preview */}
      {previewRows.length > 0 && (
        <div className={`px-4 pb-4`}>
          <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-[#252937] bg-surface-800/50' : 'border-[#EEF0F4] bg-surface-50'}`}>
            <div className={`px-3 py-2 border-b flex items-center justify-between ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
              <span className={`text-[10px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
                Pipeline Preview
              </span>
              <span className={`text-[10px] ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>First 5 rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead className={isDark ? 'text-surface-500 bg-surface-800' : 'text-surface-400 bg-surface-100'}>
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">timestamp</th>
                    <th className="px-2 py-1.5 text-left font-medium">frame_id</th>
                    <th className="px-2 py-1.5 text-left font-medium">scene_change</th>
                    <th className="px-2 py-1.5 text-left font-medium">motion</th>
                    <th className="px-2 py-1.5 text-left font-medium">risk</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={`${row.frame_id}-${row.timestamp}`} className={`border-t ${isDark ? 'border-[#252937] text-surface-300' : 'border-[#EEF0F4] text-surface-600'}`}>
                      <td className="px-2 py-1.5 tabular-nums">{row.timestamp}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.frame_id}</td>
                      <td className="px-2 py-1.5">{String(row.scene_change)}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.motion_score}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.attention_drop_risk}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default VideoPlayer;
