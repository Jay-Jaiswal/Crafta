import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import { postFeedback } from '../services/api';

const tagColors = {
  'Hook Weak': { bg: 'bg-pink-500/10', text: 'text-pink-500', border: 'border-pink-500/20' },
  'Too Slow': { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  'Repetitive': { bg: 'bg-brand-500/10', text: 'text-brand-500', border: 'border-brand-500/20' },
};

const SuggestionsPanel = () => {
  const data = useStore((s) => s.data);
  const feedbackMap = useStore((s) => s.feedbackMap);
  const recordFeedback = useStore((s) => s.recordFeedback);
  const setHighlightedSegment = useStore((s) => s.setHighlightedSegment);
  const currentTime = useStore((s) => s.currentTime);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const suggestions = data?.suggestions || [];

  const handleFeedback = async (id, isAccurate) => {
    recordFeedback(id, isAccurate);
    await postFeedback(id, isAccurate);
    toast.success(
      isAccurate ? 'Feedback recorded' : 'Feedback noted',
      {
        duration: 2500,
        className: 'toast-success',
      }
    );
  };

  const handleJump = (suggestion) => {
    setHighlightedSegment({ start: suggestion.jumpTo, end: suggestion.jumpTo + 6 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="card overflow-hidden"
    >
      <Toaster position="bottom-right" />

      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Suggestions
          </span>
        </div>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isDark ? 'bg-surface-800 text-surface-400' : 'bg-surface-100 text-surface-500'}`}>
          {suggestions.length}
        </span>
      </div>

      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {suggestions.map((suggestion, i) => {
          const tag = tagColors[suggestion.tag] || tagColors['Hook Weak'];
          const hasFeedback = feedbackMap[suggestion.id] !== undefined;
          const isRelevant = currentTime >= suggestion.jumpTo && currentTime <= suggestion.jumpTo + 6;

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              className={`relative p-3.5 rounded-lg border transition-all duration-200 ${
                isRelevant
                  ? isDark
                    ? 'bg-brand-500/5 border-brand-500/20'
                    : 'bg-brand-50/50 border-brand-200'
                  : isDark
                  ? 'bg-surface-800/30 border-transparent hover:bg-surface-800/50'
                  : 'bg-white border-transparent hover:bg-surface-50'
              }`}
            >
              {isRelevant && (
                <motion.div
                  className="absolute -top-px -right-px w-1.5 h-1.5 rounded-full bg-brand-500"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              <p className={`text-xs leading-relaxed mb-2.5 ${isDark ? 'text-surface-200' : 'text-surface-700'}`}>
                {suggestion.text}
              </p>

              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${tag.bg} ${tag.text} ${tag.border}`}>
                  {suggestion.tag}
                </span>
                <span className="text-[10px] text-cyan-500 font-medium">{suggestion.impact}</span>
                <span className={`text-[10px] ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
                  {suggestion.confidence}%
                </span>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => handleJump(suggestion)}
                  className="flex items-center gap-1 text-[11px] text-brand-500 hover:text-brand-600 transition-colors font-medium"
                >
                  <ArrowRight className="w-3 h-3" />
                  Jump to {Math.floor(suggestion.jumpTo / 60)}:{String(suggestion.jumpTo % 60).padStart(2, '0')}
                </button>

                <div className="flex items-center gap-1">
                  {hasFeedback ? (
                    <span className={`text-[10px] italic ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
                      {feedbackMap[suggestion.id] ? 'Helpful' : 'Noted'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleFeedback(suggestion.id, true)}
                        className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-emerald-500/10 text-surface-600 hover:text-emerald-400' : 'hover:bg-emerald-50 text-surface-400 hover:text-emerald-500'}`}
                        title="Accurate"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(suggestion.id, false)}
                        className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-500/10 text-surface-600 hover:text-red-400' : 'hover:bg-red-50 text-surface-400 hover:text-red-500'}`}
                        title="Not accurate"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {suggestions.length === 0 && (
          <div className={`text-center py-8 ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
            <p className="text-xs">No suggestions yet</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default SuggestionsPanel;
