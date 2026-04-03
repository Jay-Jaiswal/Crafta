import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, Eye, Clock } from 'lucide-react';
import useStore from '../store/useStore';

const SummaryBar = () => {
  const data = useStore((s) => s.data);

  if (!data) return null;

  const stats = [
    { icon: Eye, label: 'Total Views', value: data.total_views?.toLocaleString() || '14,850', color: 'text-accent-cyan' },
    { icon: TrendingUp, label: 'Attention Score', value: `${data.overall_score || 72}%`, color: 'text-accent-purple' },
    { icon: Clock, label: 'Avg Watch Time', value: data.avg_watch_time || '38s', color: 'text-accent-blue' },
    { icon: AlertTriangle, label: 'Drop Points', value: data.drops?.length || 3, color: 'text-danger-soft' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/10 via-accent-purple/10 to-accent-pink/10 animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-r from-dark-900/90 via-dark-900/70 to-dark-900/90" />

      {/* Moving shimmer */}
      <motion.div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.08), transparent)',
          backgroundSize: '200% 100%',
        }}
        animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative px-6 py-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5">
          {/* AI Summary */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-warning"
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-warning/80">
                AI Insight
              </span>
              <div className="flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-accent-purple/10 border border-accent-purple/20">
                <span className="text-[10px] text-accent-purple font-medium">
                  Confidence: {data.drops?.[0]?.confidence || 89}%
                </span>
              </div>
            </div>
            <p className="text-sm lg:text-base text-slate-300 leading-relaxed line-clamp-2">
              <span className="text-white font-medium">⚠️ </span>
              {data.summary}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-dark-800/50 border border-white/[0.04] min-w-[80px]"
              >
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-base font-bold text-white">{stat.value}</span>
                <span className="text-[10px] text-slate-500 whitespace-nowrap">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-purple/30 to-transparent" />
    </motion.div>
  );
};

export default SummaryBar;
