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
import useThemeStore from '../store/useThemeStore';

const EMPTY_LIST = [];

const CustomTooltip = ({ active, payload, label }) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  if (!active || !payload || !payload.length) return null;
  const score = payload[0].value;
  const item = payload[0].payload;

  const getColor = (s) => (s >= 70 ? '#10B981' : s >= 45 ? '#F59E0B' : '#EF4444');
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
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`px-3.5 py-2.5 rounded-lg border shadow-sm min-w-[190px] ${
        isDark ? 'bg-[#1A1D28] border-[#252937]' : 'bg-white border-[#EEF0F4]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
          {Math.floor(label / 60)}:{String(Math.floor(label % 60)).padStart(2, '0')}
        </span>
        <span className="text-sm font-semibold" style={{ color: getColor(score) }}>
          {score}%
        </span>
      </div>
      <div className="text-xs font-medium mb-1" style={{ color: getColor(score) }}>
        {getLabel(score)}
      </div>
      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
        {getSuggestion(score)}
      </p>
      {item.label && (
        <div className={`mt-1.5 pt-1.5 border-t ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
          <span className={`text-[10px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{item.label}</span>
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
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const scores = data?.attention_scores ?? EMPTY_LIST;
  const drops = data?.drops ?? EMPTY_LIST;
  const whatIf = data?.whatIf;
  const textColor = '#6B7585';
  const gridColor = isDark ? '#252937' : '#EEF0F4';

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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Attention Over Time
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[10px]">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> High
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Drop
          </span>
        </div>
      </div>

      <div className="px-2 pt-3 pb-1">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="improvedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dropZone" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.01} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />

            {drops.map((drop, i) => (
              <ReferenceArea
                key={`drop-${i}`}
                x1={drop.start}
                x2={drop.end}
                y1={0}
                y2={100}
                fill="url(#dropZone)"
                stroke="#EF4444"
                strokeOpacity={0.1}
                strokeDasharray="3 3"
              />
            ))}

            {highlightedSegment && (
              <ReferenceArea
                x1={highlightedSegment.start}
                x2={highlightedSegment.end}
                y1={0}
                y2={100}
                fill="rgba(139, 92, 246, 0.06)"
                stroke="#8B5CF6"
                strokeOpacity={0.2}
              />
            )}

            <XAxis
              dataKey="time"
              tickFormatter={(t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`}
              tick={{ fill: textColor, fontSize: 10 }}
              axisLine={{ stroke: gridColor }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: textColor, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: 'rgba(139,92,246,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {whatIfEnabled && (
              <Area
                type="monotone"
                dataKey="improvedScore"
                stroke="#06B6D4"
                strokeWidth={1.5}
                strokeDasharray="5 3"
                fill="url(#improvedGradient)"
                animationDuration={1200}
              />
            )}

            <Area
              type="monotone"
              dataKey="score"
              stroke="#8B5CF6"
              strokeWidth={2}
              fill="url(#scoreGradient)"
              animationDuration={1500}
              dot={false}
              activeDot={{ r: 4, fill: '#8B5CF6', stroke: isDark ? '#1A1D28' : '#FFFFFF', strokeWidth: 2 }}
            />

            <ReferenceLine
              x={currentTime}
              stroke={isDark ? '#E2E8F0' : '#1A202C'}
              strokeWidth={1}
              strokeOpacity={0.3}
              strokeDasharray="3 3"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default AttentionChart;
