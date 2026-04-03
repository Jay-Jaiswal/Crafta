import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';

const DonutChart = () => {
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const chartData = [
    { name: 'High', value: data?.high_pct || 42 },
    { name: 'Medium', value: data?.medium_pct || 31 },
    { name: 'Drop Risk', value: data?.drop_pct || 27 },
  ];

  const colors = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Distribution
          </span>
        </div>
      </div>

      <div className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index]} />
              ))}
            </Pie>
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
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              wrapperStyle={{ fontSize: '10px', paddingTop: '8px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default DonutChart;
