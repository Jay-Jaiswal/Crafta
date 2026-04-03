import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, TrendingUp, Scissors, ChevronDown } from 'lucide-react';
import useStore from '../store/useStore';

const WhatIfPanel = () => {
  const data = useStore((s) => s.data);
  const whatIfEnabled = useStore((s) => s.whatIfEnabled);
  const toggleWhatIf = useStore((s) => s.toggleWhatIf);

  const whatIf = data?.whatIf;
  if (!whatIf) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="glass-card overflow-hidden"
    >
      {/* Header with Toggle */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Wand2 className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            What If Simulation
          </span>
        </div>
        <button
          onClick={toggleWhatIf}
          className={`relative w-11 h-6 rounded-full transition-all duration-300 ${
            whatIfEnabled
              ? 'bg-accent-cyan/30 border-accent-cyan/40'
              : 'bg-dark-600 border-dark-500'
          } border`}
        >
          <motion.div
            animate={{ x: whatIfEnabled ? 20 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`absolute top-0.5 w-4.5 h-4.5 rounded-full transition-colors ${
              whatIfEnabled ? 'bg-accent-cyan shadow-lg shadow-accent-cyan/30' : 'bg-slate-400'
            }`}
            style={{ width: 18, height: 18 }}
          />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {whatIfEnabled ? (
            <motion.div
              key="enabled"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {/* Score improvement */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 p-3 rounded-xl bg-dark-800/50 border border-white/[0.04] text-center">
                  <span className="text-[10px] text-slate-500 block mb-1">Current</span>
                  <span className="text-2xl font-bold text-slate-300">{whatIf.originalScore}%</span>
                </div>
                <motion.div
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <TrendingUp className="w-5 h-5 text-accent-cyan" />
                </motion.div>
                <div className="flex-1 p-3 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20 text-center">
                  <span className="text-[10px] text-accent-cyan block mb-1">Simulated</span>
                  <span className="text-2xl font-bold text-accent-cyan">{whatIf.improvedScore}%</span>
                </div>
              </div>

              {/* Improvement badge */}
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 border border-accent-cyan/20"
                >
                  <span className="text-sm font-bold text-accent-cyan">
                    +{whatIf.improvement}% predicted improvement
                  </span>
                </motion.div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-400 leading-relaxed mb-3 text-center">
                {whatIf.description}
              </p>

              {/* Trimmed segments */}
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  Suggested Trims
                </span>
                {whatIf.trimmedSegments.map((seg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-2 p-2 rounded-lg bg-dark-700/30 border border-white/[0.03]"
                  >
                    <Scissors className="w-3.5 h-3.5 text-danger-soft shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs text-slate-300">{seg.label}</span>
                      <span className="text-[10px] text-slate-600 ml-2">
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
              className="text-center py-4"
            >
              <Wand2 className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">
                Enable simulation to see predicted engagement improvement
              </p>
              <p className="text-[10px] text-slate-600 mt-1">
                "If trimmed, engagement improves +{whatIf.improvement}%"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default WhatIfPanel;
