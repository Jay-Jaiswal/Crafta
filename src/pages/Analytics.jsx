import { motion } from 'framer-motion';
import {
  TrendingUp,
  Eye,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Zap,
  Target,
} from 'lucide-react';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import RadarViz from '../components/RadarViz';
import DonutChart from '../components/DonutChart';
import BarViz from '../components/BarViz';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const mockTimeline = [
  { time: '0:00', score: 78, drops: 0 },
  { time: '0:30', score: 82, drops: 0 },
  { time: '1:00', score: 65, drops: 1 },
  { time: '1:30', score: 71, drops: 0 },
  { time: '2:00', score: 58, drops: 1 },
  { time: '2:30', score: 45, drops: 2 },
  { time: '3:00', score: 62, drops: 0 },
  { time: '3:30', score: 75, drops: 0 },
  { time: '4:00', score: 88, drops: 0 },
  { time: '4:30', score: 72, drops: 1 },
  { time: '5:00', score: 68, drops: 0 },
  { time: '5:30', score: 55, drops: 1 },
];

const mockDropEvents = [
  { time: '1:00', severity: 'medium', reason: 'Scene transition too slow' },
  { time: '2:00', severity: 'high', reason: 'No face detected for 15s' },
  { time: '2:30', severity: 'critical', reason: 'Audio energy dropped below threshold' },
  { time: '4:30', severity: 'medium', reason: 'Repetitive visual pattern' },
  { time: '5:30', severity: 'high', reason: 'Pacing significantly slowed' },
];

const Analytics = () => {
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const score = data?.overall_score || 72;
  const scoreColor = score >= 70 ? 'text-emerald-500' : score >= 45 ? 'text-amber-500' : 'text-red-500';
  const strokeColor = score >= 70 ? '#10B981' : score >= 45 ? '#F59E0B' : '#EF4444';
  const textColor = isDark ? '#6B7585' : '#6B7585';
  const gridColor = isDark ? '#252937' : '#EEF0F4';

  return (
    <div className="page-enter">
      {/* Header */}
      <div className="mb-6">
        <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>
          Analytics
        </h2>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>
          Deep dive into your video performance metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Eye, label: 'Attention Score', value: `${score}%`, change: '+5.2%', up: true },
          { icon: Activity, label: 'Avg Engagement', value: '68%', change: '+2.1%', up: true },
          { icon: Clock, label: 'Avg Watch Time', value: data?.avg_watch_time || '38s', change: '-1.3s', up: false },
          { icon: AlertTriangle, label: 'Drop Points', value: data?.drops?.length || 5, change: '+2', up: false },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-4 h-4 ${isDark ? 'text-surface-400' : 'text-surface-500'}`} />
              <div className={`flex items-center gap-0.5 text-[11px] font-medium ${stat.up ? 'text-emerald-500' : 'text-red-500'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <p className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>{stat.value}</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Score Gauge + Radar + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Gauge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card p-6 flex flex-col items-center justify-center"
        >
          <div className="relative w-36 h-36">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke={isDark ? '#252937' : '#EEF0F4'} strokeWidth="7" />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke={strokeColor}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 283} 283`}
                className="gauge-fill"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-semibold ${scoreColor}`}>{score}</span>
              <span className={`text-xs ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>Overall</span>
            </div>
          </div>
          <div className={`mt-3 px-3 py-1.5 rounded-full text-xs font-medium ${
            score >= 70
              ? isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              : score >= 45
              ? isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
              : isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'
          }`}>
            {score >= 70 ? 'Strong Performance' : score >= 45 ? 'Needs Improvement' : 'Critical'}
          </div>
        </motion.div>

        <RadarViz />
        <DonutChart />
      </div>

      {/* Timeline Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden mb-6"
      >
        <div className={`px-5 py-3.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              <span className={`text-xs font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
                Engagement Timeline
              </span>
            </div>
          </div>
        </div>

        <div className="px-3 pt-4 pb-2">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockTimeline}>
              <defs>
                <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
              <XAxis dataKey="time" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                contentStyle={{
                  background: isDark ? '#1A1D28' : '#FFFFFF',
                  border: `1px solid ${isDark ? '#252937' : '#EEF0F4'}`,
                  borderRadius: '8px',
                  color: isDark ? '#E2E8F0' : '#1A202C',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                }}
              />
              <Area type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} fill="url(#timelineGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <BarViz />

        {/* Drop Events */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card overflow-hidden"
        >
          <div className={`px-5 py-3.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className={`text-xs font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
                  Drop Events
                </span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md ${isDark ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>
                {mockDropEvents.length} events
              </span>
            </div>
          </div>

          <div className="p-4 space-y-2.5 max-h-[260px] overflow-y-auto">
            {mockDropEvents.map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? 'bg-surface-800/50' : 'bg-surface-50'}`}
              >
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                  event.severity === 'critical' ? 'bg-red-500/10' :
                  event.severity === 'high' ? 'bg-amber-500/10' : 'bg-blue-500/10'
                }`}>
                  <Zap className={`w-3.5 h-3.5 ${
                    event.severity === 'critical' ? 'text-red-500' :
                    event.severity === 'high' ? 'text-amber-500' : 'text-blue-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium ${isDark ? 'text-surface-200' : 'text-surface-800'}`}>{event.reason}</p>
                  <p className={`text-[10px] ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>at {event.time}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                  event.severity === 'critical' ? 'bg-red-500/10 text-red-500' :
                  event.severity === 'high' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                }`}>
                  {event.severity}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Target, label: 'Retention', value: '64%' },
          { icon: Zap, label: 'Peak Score', value: '88%' },
          { icon: Activity, label: 'Lowest', value: '45%' },
          { icon: Eye, label: 'Visual', value: '65' },
          { icon: Clock, label: 'Audio', value: '58' },
          { icon: TrendingUp, label: 'Trend', value: '+3.2%' },
        ].map((metric, i) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.04 }}
            className="card p-3 text-center"
          >
            <metric.icon className={`w-3.5 h-3.5 mx-auto mb-2 ${isDark ? 'text-surface-500' : 'text-surface-400'}`} />
            <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>{metric.value}</p>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>{metric.label}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;
