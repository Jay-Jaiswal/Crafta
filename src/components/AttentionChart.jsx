import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  CartesianGrid,
} from 'recharts';
import useStore from '../store/useStore';

const EMPTY_LIST = [];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const score = payload[0].value;
  const item = payload[0].payload;

  const getColor = (s) => (s >= 70 ? '#10B981' : s >= 45 ? '#F59E0B' : '#F87171');
  const getLabel = (s) =>
    s >= 70 ? 'High engagement' : s >= 45 ? 'Medium attention' : 'Low engagement — risk of drop';
  const getSuggestion = (s) =>
    s >= 70
      ? 'Viewers are engaged. Maintain this energy.'
      : s >= 45
      ? 'Consider adding visual variety or a hook here.'
      : 'Add a face, question, or strong visual cut to recover attention.';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="px-4 py-3 rounded-xl bg-dark-700/95 backdrop-blur-md border border-white/10 shadow-2xl min-w-[200px]"
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-400">
          {Math.floor(label / 60)}:{String(Math.floor(label % 60)).padStart(2, '0')}
        </span>
        <span className="text-sm font-bold" style={{ color: getColor(score) }}>
          {score}%
        </span>
      </div>
      <div className="text-xs font-medium mb-1" style={{ color: getColor(score) }}>
        {getLabel(score)}
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        {getSuggestion(score)}
      </p>
      {item.label && (
        <div className="mt-1.5 pt-1.5 border-t border-white/[0.06]">
          <span className="text-[10px] text-slate-500">{item.label}</span>
        </div>
      )}
    </motion.div>
  );
};

const AttentionChart = () => {
  const data = useStore((s) => s.data);
  const currentTime = useStore((s) => s.currentTime);
  const whatIfEnabled = useStore((s) => s.whatIfEnabled);
  const highlightedSegment = useStore((s) => s.highlightedSegment);

  const scores = data?.attention_scores ?? EMPTY_LIST;
  const drops = data?.drops ?? EMPTY_LIST;
  const whatIf = data?.whatIf;

  // Generate "what if" improved scores
  const chartData = useMemo(() => {
    return scores.map((s) => {
      let improvedScore = s.score;
      if (whatIfEnabled && whatIf) {
        const inTrimZone = whatIf.trimmedSegments.some(
          (ts) => s.time >= ts.start && s.time <= ts.end
        );
        const deterministicBoost = ((s.time % 7) / 7) * 5;
        if (inTrimZone) {
          improvedScore = Math.min(100, s.score + whatIf.improvement + deterministicBoost);
        } else {
          improvedScore = Math.min(100, s.score + whatIf.improvement * 0.3);
        }
      }
      return { ...s, improvedScore: Math.round(improvedScore) };
    });
  }, [scores, whatIfEnabled, whatIf]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="glass-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Attention Analytics
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" /> High (&gt;70%)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-warning" /> Medium
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-soft" /> Drop
          </span>
          {whatIfEnabled && (
            <span className="flex items-center gap-1 text-accent-cyan">
              <span className="w-2 h-2 rounded-full bg-accent-cyan" /> Simulated
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-3 pt-4 pb-2">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.3} />
                <stop offset="50%" stopColor="#8B5CF6" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="improvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dropZone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F87171" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#F87171" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} />

            {/* Drop zone shading */}
            {drops.map((drop, i) => (
              <ReferenceArea
                key={`drop-${i}`}
                x1={drop.start}
                x2={drop.end}
                y1={0}
                y2={100}
                fill="url(#dropZone)"
                stroke="#F87171"
                strokeOpacity={0.15}
                strokeDasharray="4 4"
              />
            ))}

            {/* Highlighted segment */}
            {highlightedSegment && (
              <ReferenceArea
                x1={highlightedSegment.start}
                x2={highlightedSegment.end}
                y1={0}
                y2={100}
                fill="rgba(139, 92, 246, 0.1)"
                stroke="#8B5CF6"
                strokeOpacity={0.3}
              />
            )}

            <XAxis
              dataKey="time"
              tickFormatter={(t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={{ stroke: 'rgba(255,255,255,0.04)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#475569', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(139,92,246,0.3)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {/* What-if improved line */}
            {whatIfEnabled && (
              <Area
                type="monotone"
                dataKey="improvedScore"
                stroke="#06B6D4"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#improvedGradient)"
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            )}

            {/* Main attention line */}
            <Area
              type="monotone"
              dataKey="score"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#scoreGradient)"
              animationDuration={2000}
              animationEasing="ease-in-out"
              dot={false}
              activeDot={{
                r: 5,
                fill: '#8B5CF6',
                stroke: '#0B0F19',
                strokeWidth: 2,
              }}
            />

            {/* Current time indicator */}
            <ReferenceLine
              x={currentTime}
              stroke="#fff"
              strokeWidth={1.5}
              strokeOpacity={0.5}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default AttentionChart;
