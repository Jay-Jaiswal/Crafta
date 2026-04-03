import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Heatmap = ({ scores, drops, duration, currentTime, onSeek, onHover, onLeave }) => {
  const barRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);

  const getScoreColor = (score) => {
    if (score >= 75) return '#10B981';
    if (score >= 55) return '#34D399';
    if (score >= 40) return '#F59E0B';
    if (score >= 25) return '#F87171';
    return '#EF4444';
  };

  const getGradient = () => {
    if (!scores.length) return 'linear-gradient(90deg, #1A2139, #1A2139)';
    const stops = scores.map((s) => {
      const pct = (s.time / duration) * 100;
      return `${getScoreColor(s.score)} ${pct}%`;
    });
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  };

  const handleMouseMove = (e) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const time = pct * duration;

    // Find closest score
    const closest = scores.reduce((prev, curr) =>
      Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
    , scores[0]);

    // Find if in a drop zone
    const drop = drops.find(d => time >= d.start && time <= d.end);

    setHoverInfo({
      x,
      time,
      score: closest?.score || 0,
      label: closest?.label || '',
      drop,
      clampedX: Math.max(60, Math.min(x, rect.width - 60 || 200)),
    });

    if (onHover) onHover(time, x);
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
    if (onLeave) onLeave();
  };

  const handleClick = (e) => {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    onSeek(pct * duration);
  };

  const progressPct = (currentTime / duration) * 100;

  return (
    <div className="relative">
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
          Attention Heatmap
        </span>
        <div className="flex items-center gap-3 text-[10px] text-slate-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-success inline-block" /> High</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-warning inline-block" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-danger-soft inline-block" /> Low</span>
        </div>
      </div>

      {/* Heatmap Bar */}
      <div
        ref={barRef}
        className="relative h-8 rounded-lg overflow-hidden cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Gradient background */}
        <div
          className="absolute inset-0 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity"
          style={{ background: getGradient() }}
        />

        {/* Overlay darkener for unfocused areas */}
        <div className="absolute inset-0 bg-dark-900/20" />

        {/* Drop zone markers */}
        {drops.map((drop, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-x border-danger-soft/30"
            style={{
              left: `${(drop.start / duration) * 100}%`,
              width: `${((drop.end - drop.start) / duration) * 100}%`,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(248,113,113,0.08) 3px, rgba(248,113,113,0.08) 6px)',
            }}
          />
        ))}

        {/* Playback position */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg shadow-white/20 z-10"
          style={{ left: `${progressPct}%` }}
          transition={{ type: 'tween', duration: 0.1 }}
        />

        {/* Playback head */}
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-white/30 z-10 -ml-1.5"
          style={{ left: `${progressPct}%` }}
        />

        {/* Hover tooltip */}
        <AnimatePresence>
          {hoverInfo && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 -top-20 pointer-events-none"
              style={{ left: hoverInfo.clampedX }}
            >
              <div className="relative -translate-x-1/2">
                <div className="px-3 py-2 rounded-lg bg-dark-700/95 backdrop-blur-md border border-white/10 shadow-xl">
                  <div className="text-xs text-white font-bold tabular-nums">
                    {Math.floor(hoverInfo.time / 60)}:{Math.floor(hoverInfo.time % 60).toString().padStart(2, '0')}
                  </div>
                  <div className={`text-[10px] font-semibold ${
                    hoverInfo.score >= 70 ? 'text-success' : hoverInfo.score >= 45 ? 'text-warning' : 'text-danger-soft'
                  }`}>
                    Attention: {hoverInfo.score}%
                  </div>
                  {hoverInfo.drop && (
                    <div className="text-[10px] text-danger-soft mt-0.5">
                      ⚠️ {hoverInfo.drop.reason}
                    </div>
                  )}
                  {hoverInfo.label && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{hoverInfo.label}</div>
                  )}
                </div>
                <div className="w-2 h-2 bg-dark-700/95 border-b border-r border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hover line */}
        {hoverInfo && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none"
            style={{ left: hoverInfo.x }}
          />
        )}
      </div>
    </div>
  );
};

export default Heatmap;
