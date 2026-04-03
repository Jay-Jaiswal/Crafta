import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, SkipBack, SkipForward } from 'lucide-react';
import useStore from '../store/useStore';
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

  const duration = data?.video_duration || 60;
  const previewRows = data?.pipeline_preview?.slice(0, 5) || [];
  const resolvedVideoUrl = data?.video_url
    ? (data.video_url.startsWith('http://') || data.video_url.startsWith('https://')
      ? data.video_url
      : `${API_BASE}${data.video_url.startsWith('/') ? '' : '/'}${data.video_url}`)
    : '';

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

  // Sync with external seek (from insights/suggestions clicking)
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
      setIsMuted(!isMuted);
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

  const scoreColor = currentScore >= 70 ? 'text-success' : currentScore >= 45 ? 'text-warning' : 'text-danger-soft';

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card overflow-hidden group"
    >
      {/* Video Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-danger-soft animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Video Intelligence
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentSegment && (
            <motion.span
              key={currentSegment.label}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                currentSegment.type === 'high'
                  ? 'bg-success/10 text-success border border-success/20'
                  : currentSegment.type === 'low'
                  ? 'bg-danger-soft/10 text-danger-soft border border-danger-soft/20'
                  : 'bg-warning/10 text-warning border border-warning/20'
              }`}
            >
              {currentSegment.label}
            </motion.span>
          )}
          <span className={`text-sm font-bold ${scoreColor} tabular-nums`}>
            {Math.round(currentScore)}%
          </span>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative aspect-video bg-dark-900 cursor-pointer" onClick={togglePlay}>
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

        {/* Play/Pause Overlay */}
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
              >
                <Play className="w-7 h-7 text-white ml-1" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Current Score Badge */}
        <div className="absolute top-3 right-3">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`px-3 py-1.5 rounded-lg backdrop-blur-md border ${
              currentScore >= 70
                ? 'bg-success/10 border-success/30 text-success'
                : currentScore >= 45
                ? 'bg-warning/10 border-warning/30 text-warning'
                : 'bg-danger-soft/10 border-danger-soft/30 text-danger-soft'
            }`}
          >
            <span className="text-xs font-bold tabular-nums">
              Attention: {Math.round(currentScore)}%
            </span>
          </motion.div>
        </div>

        {/* Drop Zone Indicators */}
        {data?.drops?.map((drop) => {
          const isActive = currentTime >= drop.start && currentTime <= drop.end;
          return isActive ? (
            <motion.div
              key={drop.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-14 left-3 right-3"
            >
              <div className="px-3 py-2 rounded-lg bg-danger-soft/10 backdrop-blur-md border border-danger-soft/20">
                <p className="text-xs text-danger-soft font-medium">
                  ⚠️ {drop.reason} ({drop.confidence}% confidence)
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
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => skip(-5)} className="text-slate-400 hover:text-white transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center text-accent-purple hover:bg-accent-purple/30 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={() => skip(5)} className="text-slate-400 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-500 tabular-nums min-w-[70px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          <button onClick={toggleMute} className="text-slate-400 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pipeline Preview Rows */}
      <div className="px-4 pb-4">
        <div className="rounded-xl border border-white/[0.06] bg-dark-800/40 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/[0.06] flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Pipeline Data Preview
            </span>
            <span className="text-[10px] text-slate-500">First 5 rows</span>
          </div>
          {previewRows.length === 0 ? (
            <div className="px-3 py-3 text-xs text-slate-500">
              Upload and process a video to see frame-level rows.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] text-slate-300">
                <thead className="text-slate-500 bg-dark-700/30">
                  <tr>
                    <th className="px-2 py-1.5 text-left">timestamp</th>
                    <th className="px-2 py-1.5 text-left">frame_id</th>
                    <th className="px-2 py-1.5 text-left">scene_change</th>
                    <th className="px-2 py-1.5 text-left">motion_score</th>
                    <th className="px-2 py-1.5 text-left">risk</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row) => (
                    <tr key={`${row.frame_id}-${row.timestamp}`} className="border-t border-white/[0.04]">
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
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPlayer;
