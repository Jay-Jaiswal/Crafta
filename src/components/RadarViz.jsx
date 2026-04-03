import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';

const RadarViz = () => {
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const radarData = useMemo(() => {
    if (!data) {
      return [
        { metric: 'Visual', value: 0, fullMark: 100 },
        { metric: 'Audio', value: 0, fullMark: 100 },
        { metric: 'Motion', value: 0, fullMark: 100 },
        { metric: 'Pacing', value: 0, fullMark: 100 },
        { metric: 'Hook', value: 0, fullMark: 100 },
        { metric: 'Retention', value: 0, fullMark: 100 },
      ];
    }
    return [
      { metric: 'Visual', value: data.visual_score || 65, fullMark: 100 },
      { metric: 'Audio', value: data.audio_score || 58, fullMark: 100 },
      { metric: 'Motion', value: data.motion_score || 72, fullMark: 100 },
      { metric: 'Pacing', value: data.pacing_score || 55, fullMark: 100 },
      { metric: 'Hook', value: data.hook_score || 80, fullMark: 100 },
      { metric: 'Retention', value: data.retention_score || 68, fullMark: 100 },
    ];
  }, [data]);

  const gridColor = isDark ? '#252937' : '#EEF0F4';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Engagement Radar
          </span>
        </div>
      </div>

      <div className="px-1 pt-2 pb-1">
        <ResponsiveContainer width="100%" height={240}>
          <RadarChart data={radarData}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#6B7585', fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#8B5CF6"
              strokeWidth={1.5}
              fill="#8B5CF6"
              fillOpacity={0.12}
            />
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
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default RadarViz;
