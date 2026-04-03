import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';

const BarViz = () => {
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const barData = [
    { label: '0-25%', value: data?.quartile_1 || 62 },
    { label: '25-50%', value: data?.quartile_2 || 74 },
    { label: '50-75%', value: data?.quartile_3 || 58 },
    { label: '75-100%', value: data?.quartile_4 || 45 },
  ];

  const textColor = '#6B7585';
  const gridColor = isDark ? '#252937' : '#EEF0F4';

  const getBarColor = (val) => {
    if (val >= 70) return '#10B981';
    if (val >= 50) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Quartile Analysis
          </span>
        </div>
      </div>

      <div className="px-2 pt-3 pb-1">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
            <XAxis dataKey="label" tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: textColor, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{
                background: isDark ? '#1A1D28' : '#FFFFFF',
                border: `1px solid ${isDark ? '#252937' : '#EEF0F4'}`,
                borderRadius: '8px',
                color: isDark ? '#E2E8F0' : '#1A202C',
                fontSize: '11px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
            <Bar dataKey="value" radius={[5, 5, 0, 0]} animationDuration={1000}>
              {barData.map((entry) => (
                <Cell key={entry.label} fill={getBarColor(entry.value)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default BarViz;
