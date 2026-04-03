import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, TrendingUp, Scissors } from 'lucide-react';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';

const WhatIfPanel = () => {
  const data = useStore((s) => s.data);
  const whatIfEnabled = useStore((s) => s.whatIfEnabled);
  const toggleWhatIf = useStore((s) => s.toggleWhatIf);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const whatIf = data?.whatIf;
  if (!whatIf) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <Wand2 className="w-3.5 h-3.5 text-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            What If
          </span>
        </div>
        <button
          onClick={toggleWhatIf}
          className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
            whatIfEnabled ? 'bg-brand-500' : isDark ? 'bg-surface-700' : 'bg-surface-300'
          }`}
        >
          <motion.div
            animate={{ x: whatIfEnabled ? 16 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm"
          />
        </button>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {whatIfEnabled ? (
            <motion.div
              key="enabled"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex-1 p-2.5 rounded-lg text-center ${isDark ? 'bg-surface-800' : 'bg-surface-50'}`}>
                  <span className={`text-[10px] block mb-0.5 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>Current</span>
                  <span className={`text-xl font-semibold ${isDark ? 'text-surface-300' : 'text-surface-700'}`}>{whatIf.originalScore}%</span>
                </div>
                <TrendingUp className="w-4 h-4 text-cyan-500 shrink-0" />
                <div className="flex-1 p-2.5 rounded-lg text-center bg-cyan-500/10 border border-cyan-500/20">
                  <span className="text-[10px] text-cyan-500 block mb-0.5">Simulated</span>
                  <span className="text-xl font-semibold text-cyan-500">{whatIf.improvedScore}%</span>
                </div>
              </div>

              <div className="flex items-center justify-center mb-3">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'}`}>
                  +{whatIf.improvement}% predicted
                </span>
              </div>

              <p className={`text-xs leading-relaxed mb-3 text-center ${isDark ? 'text-surface-400' : 'text-surface-500'}`}>
                {whatIf.description}
              </p>

              <div className="space-y-1.5">
                <span className={`text-[10px] font-medium uppercase tracking-wider ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                  Suggested Trims
                </span>
                {whatIf.trimmedSegments.map((seg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className={`flex items-center gap-2 p-2 rounded-md ${isDark ? 'bg-surface-800/50' : 'bg-surface-50'}`}
                  >
                    <Scissors className="w-3 h-3 text-red-500 shrink-0" />
                    <div className="flex-1">
                      <span className={`text-xs ${isDark ? 'text-surface-200' : 'text-surface-700'}`}>{seg.label}</span>
                      <span className={`text-[10px] ml-1.5 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                        {seg.start}s – {seg.end}s
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="disabled"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-3"
            >
              <Wand2 className={`w-6 h-6 mx-auto mb-1.5 ${isDark ? 'text-surface-700' : 'text-surface-300'}`} />
              <p className={`text-xs ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                Enable to see predicted improvements
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default WhatIfPanel;
