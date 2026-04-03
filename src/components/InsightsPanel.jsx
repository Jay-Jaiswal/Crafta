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
import useThemeStore from '../store/useThemeStore';

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
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    text: 'text-red-500',
    dot: 'bg-red-500',
  },
  medium: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
    dot: 'bg-amber-500',
  },
  low: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-500',
    dot: 'bg-blue-500',
  },
};

const InsightsPanel = () => {
  const data = useStore((s) => s.data);
  const activeInsight = useStore((s) => s.activeInsight);
  const setActiveInsight = useStore((s) => s.setActiveInsight);
  const currentTime = useStore((s) => s.currentTime);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const insights = data?.insights || [];

  const handleClick = (insight) => {
    setActiveInsight(insight);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="card overflow-hidden flex flex-col"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Insights
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isDark ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>
          {insights.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[400px]">
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleClick(insight)}
                className={`relative p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                  isActive
                    ? `${colors.bg} ${colors.border}`
                    : isLive
                    ? `${isDark ? 'bg-surface-800/50' : 'bg-surface-50'} ${colors.border}`
                    : `${isDark ? 'bg-surface-800/30 border-transparent hover:bg-surface-800/50' : 'bg-white border-transparent hover:bg-surface-50'}`
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${colors.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${colors.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className={`text-xs font-medium truncate ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>
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
                    <p className={`text-[11px] leading-relaxed mb-1.5 line-clamp-2 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                      {insight.description}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-surface-700 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>
                        {insight.timeRange}
                      </span>
                      <span className={`text-[10px] font-medium ${colors.text}`}>
                        {insight.confidence}%
                      </span>
                    </div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 mt-0.5 transition-colors ${
                    isActive ? colors.text : isDark ? 'text-surface-700' : 'text-surface-300'
                  }`} />
                </div>

                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className={`mt-2.5 pt-2.5 border-t ${isDark ? 'border-white/[0.05]' : 'border-surface-200'}`}>
                        <p className={`text-xs leading-relaxed ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                          Detected using multi-modal analysis of visual features, audio energy, and viewer behavior patterns.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {insights.length === 0 && (
          <div className={`text-center py-8 ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
            <p className="text-xs">No insights detected</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InsightsPanel;
