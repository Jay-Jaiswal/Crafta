import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Eye, Clock } from 'lucide-react';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';

const SummaryBar = () => {
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  if (!data) return null;

  const stats = [
    { icon: Eye, label: 'Total Views', value: data.total_views?.toLocaleString() || '14,850', color: 'text-blue-500' },
    { icon: TrendingUp, label: 'Attention Score', value: `${data.overall_score || 72}%`, color: 'text-brand-500' },
    { icon: Clock, label: 'Avg Watch Time', value: data.avg_watch_time || '38s', color: 'text-surface-500' },
    { icon: AlertTriangle, label: 'Drop Points', value: data.drops?.length || 3, color: 'text-red-500' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`card overflow-hidden ${isDark ? '' : ''}`}
    >
      <div className="px-5 py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
          {/* AI Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                AI Insight
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${isDark ? 'bg-brand-500/10 text-brand-400' : 'bg-brand-50 text-brand-600'}`}>
                {data.drops?.[0]?.confidence || 89}% confidence
              </span>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-surface-300' : 'text-surface-700'}`}>
              {data.summary}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08 }}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg ${isDark ? 'bg-surface-800' : 'bg-surface-50'}`}
              >
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className={`text-base font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>{stat.value}</span>
                <span className={`text-[10px] whitespace-nowrap ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SummaryBar;
