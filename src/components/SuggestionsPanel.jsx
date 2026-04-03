import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import useStore from '../store/useStore';
import { postFeedback } from '../services/api';

const tagColors = {
  'Hook Weak': { bg: 'bg-accent-pink/10', text: 'text-accent-pink', border: 'border-accent-pink/20' },
  'Too Slow': { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  'Repetitive': { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/20' },
};

const SuggestionsPanel = () => {
  const data = useStore((s) => s.data);
  const feedbackMap = useStore((s) => s.feedbackMap);
  const recordFeedback = useStore((s) => s.recordFeedback);
  const setHighlightedSegment = useStore((s) => s.setHighlightedSegment);
  const currentTime = useStore((s) => s.currentTime);

  const suggestions = data?.suggestions || [];

  const handleFeedback = async (id, isAccurate) => {
    recordFeedback(id, isAccurate);
    await postFeedback(id, isAccurate);
    toast.success(
      isAccurate
        ? '👍 Feedback recorded. Model improving.'
        : '👎 Feedback noted. We\'ll refine this insight.',
      {
        duration: 3000,
        style: {
          background: 'rgba(15, 20, 35, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: '#E2E8F0',
          borderRadius: '12px',
          fontSize: '13px',
        },
      }
    );
  };

  const handleJump = (suggestion) => {
    setHighlightedSegment({ start: suggestion.jumpTo, end: suggestion.jumpTo + 6 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="glass-card overflow-hidden"
    >
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            AI Suggestions
          </span>
        </div>
        <span className="text-[10px] text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">
          {suggestions.length} actions
        </span>
      </div>

      {/* Suggestions List */}
      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {suggestions.map((suggestion, i) => {
          const tag = tagColors[suggestion.tag] || tagColors['Hook Weak'];
          const hasFeedback = feedbackMap[suggestion.id] !== undefined;
          const isRelevant = currentTime >= suggestion.jumpTo && currentTime <= suggestion.jumpTo + 6;

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.08 }}
              className={`relative p-3.5 rounded-xl border transition-all duration-300 ${
                isRelevant
                  ? 'bg-accent-purple/5 border-accent-purple/20 shadow-lg shadow-accent-purple/5'
                  : 'bg-dark-800/30 border-white/[0.03] hover:bg-dark-700/30 hover:border-white/[0.06]'
              } glass-card-hover`}
            >
              {/* Live indicator */}
              {isRelevant && (
                <motion.div
                  className="absolute -top-px -right-px w-2 h-2 rounded-full bg-accent-purple"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Suggestion text */}
              <p className="text-sm text-slate-200 leading-relaxed mb-3">
                {suggestion.text}
              </p>

              {/* Meta row */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tag.bg} ${tag.text} ${tag.border}`}>
                  {suggestion.tag}
                </span>
                <span className="text-[10px] text-accent-cyan font-medium">
                  {suggestion.impact}
                </span>
                <span className="text-[10px] text-slate-600">
                  {suggestion.confidence}% conf.
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                {/* Jump button */}
                <button
                  onClick={() => handleJump(suggestion)}
                  className="flex items-center gap-1.5 text-[11px] text-accent-purple hover:text-accent-blue transition-colors font-medium"
                >
                  <ArrowRight className="w-3 h-3" />
                  Jump to {Math.floor(suggestion.jumpTo / 60)}:{String(suggestion.jumpTo % 60).padStart(2, '0')}
                </button>

                {/* Feedback buttons */}
                <div className="flex items-center gap-1.5">
                  {hasFeedback ? (
                    <span className="text-[10px] text-slate-500 italic">
                      {feedbackMap[suggestion.id] ? '✓ Helpful' : '✓ Noted'}
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleFeedback(suggestion.id, true)}
                        className="p-1.5 rounded-lg hover:bg-success/10 text-slate-500 hover:text-success transition-all"
                        title="Accurate"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleFeedback(suggestion.id, false)}
                        className="p-1.5 rounded-lg hover:bg-danger-soft/10 text-slate-500 hover:text-danger-soft transition-all"
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
      </div>
    </motion.div>
  );
};

export default SuggestionsPanel;
