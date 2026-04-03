import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown, ArrowRight, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import { postFeedback } from '../services/api';

const tagColors = {
  'Hook Weak': { bg: 'bg-amber-500/12', text: 'text-amber-600', border: 'border-amber-400/40' },
  'Too Slow': { bg: 'bg-amber-500/12', text: 'text-amber-600', border: 'border-amber-400/40' },
  'Repetitive': { bg: 'bg-amber-500/12', text: 'text-amber-600', border: 'border-amber-400/40' },
};

const formatTime = (seconds) => {
  const total = Math.max(0, Math.round(Number(seconds || 0)));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, '0')}`;
};

const defaultAlternativesByTag = {
  'Hook Weak': [
    'Open with a bold question.',
    'Show the outcome first, then explain.',
    'Add a high-contrast visual cue early.',
  ],
  'Too Slow': [
    'Trim pauses longer than 1 second.',
    'Increase shot-change frequency.',
    'Add voice emphasis or a music lift.',
  ],
  Repetitive: [
    'Insert a contrasting b-roll cut.',
    'Switch camera angle or framing.',
    'Use on-screen text to reset attention.',
  ],
};

const parseRangeFromText = (text) => {
  const match = String(text || '').match(/\bat\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})[,\s]/i);
  if (!match) return null;
  return { startLabel: match[1], endLabel: match[2] };
};

const stripRangePrefix = (text) => {
  const cleaned = String(text || '').replace(/^\s*at\s+\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*,?\s*/i, '').trim();
  if (!cleaned) return 'Improve this segment with clearer pacing and visual variety.';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const SuggestionsPanel = () => {
  const data = useStore((s) => s.data);
  const feedbackMap = useStore((s) => s.feedbackMap);
  const recordFeedback = useStore((s) => s.recordFeedback);
  const setHighlightedSegment = useStore((s) => s.setHighlightedSegment);
  const currentTime = useStore((s) => s.currentTime);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const suggestions = (data?.suggestions || []).map((item) => {
    const tag = item.tag || 'Hook Weak';
    const jumpTo = item.jumpTo ?? item.jump_to ?? 0;
    const parsedRange = parseRangeFromText(item.text);
    const alternatives = Array.isArray(item.alternatives) && item.alternatives.length > 0
      ? item.alternatives.slice(0, 3)
      : (defaultAlternativesByTag[tag] || defaultAlternativesByTag['Hook Weak']);

    return {
      ...item,
      tag,
      jumpTo,
      displayText: stripRangePrefix(item.text),
      segmentLabel: parsedRange
        ? `${parsedRange.startLabel} - ${parsedRange.endLabel}`
        : `${formatTime(jumpTo)} - ${formatTime(jumpTo + 3)}`,
      alternatives,
    };
  });

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

              <p className={`text-xs leading-relaxed mb-2 ${isDark ? 'text-surface-200' : 'text-surface-700'}`}>
                {suggestion.displayText}
              </p>

              <p className={`text-[10px] mb-2.5 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                Segment: {suggestion.segmentLabel}
              </p>

              {suggestion.alternatives.length > 0 && (
                <div className="mb-2.5 space-y-1">
                  <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
                    Alternatives
                  </p>
                  {suggestion.alternatives.map((option, idx) => (
                    <div
                      key={`${suggestion.id}-alt-${idx}`}
                      className={`flex items-start gap-2 rounded-md px-2 py-1 border ${isDark ? 'bg-amber-500/8 border-amber-400/30' : 'bg-amber-50 border-amber-200'}`}
                    >
                      <span className={`mt-0.5 inline-block w-1.5 h-1.5 rounded-sm ${isDark ? 'bg-amber-400' : 'bg-amber-500'}`} />
                      <p className={`text-[11px] leading-relaxed ${isDark ? 'text-surface-300' : 'text-surface-600'}`}>
                        {option}
                      </p>
                    </div>
                  ))}
                </div>
              )}

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
                  Jump to {formatTime(suggestion.jumpTo)}
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
