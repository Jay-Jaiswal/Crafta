import { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useThemeStore from '../store/useThemeStore';

const Heatmap = ({ scores, drops, duration, currentTime, onSeek }) => {
  const barRef = useRef(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const scoreBands = useMemo(() => {
    const values = scores
      .map((point) => Number(point?.score) || 0)
      .sort((a, b) => a - b);

    if (!values.length) {
      return { high: 70, medium: 45, low: 30 };
    }

    const spread = values[values.length - 1] - values[0];
    if (spread < 12) {
      return { high: 70, medium: 45, low: 30 };
    }

    const pick = (percentile) => {
      const idx = Math.round((values.length - 1) * percentile);
      return values[Math.max(0, Math.min(values.length - 1, idx))];
    };

    return {
      high: Math.max(55, pick(0.75)),
      medium: Math.max(40, pick(0.45)),
      low: Math.max(25, pick(0.2)),
    };
  }, [scores]);

  const getScoreColor = (score) => {
    if (score >= scoreBands.high) return '#10B981';
    if (score >= scoreBands.medium) return '#34D399';
    if (score >= scoreBands.low) return '#F59E0B';
    if (score >= 20) return '#F97316';
    return '#EF4444';
  };

  const getGradient = () => {
    if (!scores.length) return `linear-gradient(90deg, ${isDark ? '#252937' : '#EEF0F4'}, ${isDark ? '#252937' : '#EEF0F4'})`;
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

    const closest = scores.reduce((prev, curr) =>
      Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
    , scores[0]);

    const drop = drops.find(d => time >= d.start && time <= d.end);

    setHoverInfo({
      x,
      time,
      score: closest?.score || 0,
      label: closest?.label || '',
      drop,
      clampedX: Math.max(60, Math.min(x, rect.width - 60 || 200)),
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
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
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
          Attention Heatmap
        </span>
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Medium</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Low</span>
        </div>
      </div>

      <div
        ref={barRef}
        className="relative h-7 rounded-md overflow-hidden cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div
          className="absolute inset-0 rounded-md"
          style={{ background: getGradient() }}
        />

        {drops.map((drop, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0"
            style={{
              left: `${(drop.start / duration) * 100}%`,
              width: `${((drop.end - drop.start) / duration) * 100}%`,
              background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(239,68,68,0.1) 3px, rgba(239,68,68,0.1) 6px)',
            }}
          />
        ))}

        <motion.div
          className="absolute top-0 bottom-0 w-px bg-white z-10"
          style={{ left: `${progressPct}%` }}
          transition={{ type: 'tween', duration: 0.1 }}
        />

        <AnimatePresence>
          {hoverInfo && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute z-20 -top-16 pointer-events-none"
              style={{ left: hoverInfo.clampedX }}
            >
              <div className={`relative -translate-x-1/2 px-2.5 py-1.5 rounded-md border shadow-sm ${
                isDark ? 'bg-surface-800 border-surface-700' : 'bg-white border-surface-200'
              }`}>
                <div className={`text-xs font-semibold tabular-nums ${isDark ? 'text-white' : 'text-surface-900'}`}>
                  {Math.floor(hoverInfo.time / 60)}:{Math.floor(hoverInfo.time % 60).toString().padStart(2, '0')}
                </div>
                <div className={`text-[10px] font-medium ${
                  hoverInfo.score >= scoreBands.high
                    ? 'text-emerald-500'
                    : hoverInfo.score >= scoreBands.medium
                      ? 'text-amber-500'
                      : 'text-red-500'
                }`}>
                  {hoverInfo.score}%
                </div>
                {hoverInfo.drop && (
                  <div className="text-[10px] text-red-500 mt-0.5">{hoverInfo.drop.reason}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Heatmap;
