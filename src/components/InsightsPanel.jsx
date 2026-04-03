import { motion, AnimatePresence } from 'framer-motion';
import {
  Move,
  User,
  Volume2,
  Repeat,
  Zap,
  Timer,
  ChevronRight,
} from 'lucide-react';
import useStore from '../store/useStore';

const iconMap = {
  motion: Move,
  face: User,
  audio: Volume2,
  repeat: Repeat,
  hook: Zap,
  pacing: Timer,
};

const severityColors = {
  high: {
    bg: 'bg-danger-soft/10',
    border: 'border-danger-soft/20',
    text: 'text-danger-soft',
    dot: 'bg-danger-soft',
  },
  medium: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    dot: 'bg-warning',
  },
  low: {
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/20',
    text: 'text-accent-blue',
    dot: 'bg-accent-blue',
  },
};

const InsightsPanel = () => {
  const data = useStore((s) => s.data);
  const activeInsight = useStore((s) => s.activeInsight);
  const setActiveInsight = useStore((s) => s.setActiveInsight);
  const currentTime = useStore((s) => s.currentTime);

  const insights = data?.insights || [];

  const handleClick = (insight) => {
    setActiveInsight(insight);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Insights Engine
          </span>
        </div>
        <span className="text-[10px] text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">
          {insights.length} detected
        </span>
      </div>

      {/* Insights List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px]">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, i) => {
            const Icon = iconMap[insight.icon] || Zap;
            const colors = severityColors[insight.severity] || severityColors.medium;
            const isActive = activeInsight?.id === insight.id;
            const isLive = currentTime >= insight.start && currentTime <= insight.end;

            return (
              <motion.div
                key={insight.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleClick(insight)}
                className={`relative p-3 rounded-xl cursor-pointer transition-all duration-300 border ${
                  isActive
                    ? `${colors.bg} ${colors.border} pulse-glow`
                    : isLive
                    ? `bg-dark-700/50 ${colors.border}`
                    : 'bg-dark-800/30 border-white/[0.03] hover:bg-dark-700/40 hover:border-white/[0.06]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-medium text-white truncate">
                        {insight.title}
                      </h4>
                      {isLive && (
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                          className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}
                        />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5 line-clamp-2">
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-600 bg-dark-600/60 px-1.5 py-0.5 rounded">
                        {insight.timeRange}
                      </span>
                      <span className={`text-[10px] font-semibold ${colors.text}`}>
                        {insight.confidence}% confidence
                      </span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className={`w-4 h-4 shrink-0 mt-1 transition-colors ${
                    isActive ? colors.text : 'text-slate-700'
                  }`} />
                </div>

                {/* Active expanded details */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-white/[0.05]">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          This insight was detected using multi-modal analysis of visual features,
                          audio energy levels, and viewer behavior patterns. The confidence score
                          reflects the model's certainty based on training data.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default InsightsPanel;
