import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Send, LoaderCircle, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import { askChatbot } from '../services/api';

const SOURCE_DETAIL_LABELS = {
  ready: 'Ready',
  groq_ok: 'Groq response',
  groq_error: 'Groq failed',
  fallback: 'Fallback response',
  auth_error: 'Provider auth failed',
  model_not_found: 'Model unavailable',
  rate_limited: 'Provider rate limited',
  no_api_key: 'API key missing',
  no_analysis: 'No analysis available',
  analysis_not_found: 'Analysis file missing',
  network_error: 'Network error',
  request_error: 'Request failed',
  timeout: 'Request timeout',
  unknown: 'Unknown source',
};

const SOURCE_STYLES = {
  groq: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
  fallback: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/25',
  system: 'bg-surface-100 text-surface-500 border-surface-200',
};

const PRESET_CHIPS = [
  {
    text: 'How can I improve the first 10 seconds?',
    keywords: ['improve', 'first', '10 seconds', 'hook', 'intro'],
  },
  {
    text: 'Why did people drop off at 25s?',
    keywords: ['drop', 'drop off', '25s', 'retention', 'attention'],
  },
  {
    text: "What's the best part of my video?",
    keywords: ['best part', 'strongest', 'highlight', 'peak'],
  },
  {
    text: 'How do I fix the audio issue?',
    keywords: ['audio', 'sound', 'voice', 'music', 'fix'],
  },
];

const createAssistantMessage = (text, source = 'system', sourceDetail = 'ready') => ({
  role: 'assistant',
  text,
  source,
  sourceDetail,
  analysisContext: null,
});

const ChatbotPanel = () => {
  const activeVideoId = useStore((s) => s.activeVideoId);
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [hasChattedOnce, setHasChattedOnce] = useState(false);
  const [messages, setMessages] = useState([
    createAssistantMessage('Ask me anything about your analyzed video.'),
  ]);

  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const node = messageListRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' });
  }, [messages, isAsking]);

  const matchedChips = useMemo(() => {
    if (hasChattedOnce) return [];

    const query = question.trim().toLowerCase();
    if (!query) return PRESET_CHIPS;

    return PRESET_CHIPS.filter((chip) => {
      if (chip.text.toLowerCase().includes(query)) return true;
      return chip.keywords.some((keyword) => keyword.toLowerCase().includes(query));
    });
  }, [hasChattedOnce, question]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setHasChattedOnce(true);
    setQuestion('');
    setIsAsking(true);

    try {
      const result = await askChatbot(trimmed, activeVideoId);
      const answer = result?.answer || 'No response generated.';
      const source = result?.source || 'fallback';
      const sourceDetail = result?.source_detail || 'fallback';
      const analysisContext = result?.analysis_context || null;

      setMessages((prev) => [
        ...prev,
        {
          ...createAssistantMessage(answer, source, sourceDetail),
          analysisContext,
        },
      ]);
    } catch (error) {
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      setMessages((prev) => [
        ...prev,
        createAssistantMessage(`Request failed: ${detail}`, 'error', 'request_error'),
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleAsk();
    }
  };

  const onChipClick = (text) => {
    setQuestion(text);
    inputRef.current?.focus();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="card overflow-hidden"
    >
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${isDark ? 'border-[#252937]' : 'border-[#EEF0F4]'}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-brand-500" />
          <span className={`text-[11px] font-medium ${isDark ? 'text-surface-400' : 'text-surface-600'}`}>
            Chat
          </span>
        </div>
        {activeVideoId && (
          <span className={`text-xs font-mono ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
            {activeVideoId.slice(0, 12)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5">
        {!data && (
          <div className={`text-sm rounded-lg border px-3 py-2 ${isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
            Upload and analyze a video first.
          </div>
        )}

        {!hasChattedOnce && matchedChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {matchedChips.map((chip) => (
              <button
                key={chip.text}
                type="button"
                onClick={() => onChipClick(chip.text)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  isDark
                    ? 'border-surface-700 bg-surface-800/80 text-surface-300 hover:border-brand-500/40 hover:text-surface-100'
                    : 'border-surface-300 bg-white text-surface-600 hover:border-brand-300 hover:text-surface-800'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                {chip.text}
              </button>
            ))}
          </div>
        )}

        <div ref={messageListRef} className="h-56 overflow-y-auto space-y-2 pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-2.5 py-2 text-[13px] leading-relaxed border ${
                message.role === 'user'
                  ? isDark
                    ? 'bg-brand-500/10 border-brand-500/20 text-surface-100'
                    : 'bg-brand-50 border-brand-200 text-surface-800'
                  : isDark
                  ? 'bg-surface-800/50 border-surface-700/60 text-surface-300'
                  : 'bg-surface-50 border-transparent text-surface-600'
              }`}
            >
              <p className="whitespace-pre-line">{message.text}</p>
              {message.role === 'assistant' && message.source && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded-md border ${SOURCE_STYLES[message.source] || SOURCE_STYLES.system}`}>
                    {message.source}
                  </span>
                  {message.sourceDetail && (
                    <span className={`text-xs ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
                      {SOURCE_DETAIL_LABELS[message.sourceDetail] || message.sourceDetail}
                    </span>
                  )}
                </div>
              )}

              {message.role === 'assistant' && message.analysisContext && (
                <div className={`mt-2 rounded-lg border p-2.5 space-y-1.5 ${isDark ? 'border-surface-700 bg-surface-900/40 text-surface-400' : 'border-surface-200 bg-white text-surface-600'}`}>
                  {Array.isArray(message.analysisContext?.insights) && message.analysisContext.insights.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Top Insight</p>
                      <p className="text-xs leading-relaxed">{message.analysisContext.insights[0]?.title || 'Insight available'}</p>
                    </div>
                  )}

                  {Array.isArray(message.analysisContext?.suggestions) && message.analysisContext.suggestions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">Top Suggestion</p>
                      <p className="text-xs leading-relaxed">{message.analysisContext.suggestions[0]?.text || 'Suggestion available'}</p>
                    </div>
                  )}

                  {message.analysisContext?.what_if?.improvement !== null && message.analysisContext?.what_if?.improvement !== undefined && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold">What-if</p>
                      <p className="text-xs leading-relaxed">
                        Improvement: +{message.analysisContext.what_if.improvement}%
                        {message.analysisContext?.what_if?.improved_score !== undefined && message.analysisContext?.what_if?.improved_score !== null
                          ? ` (to ${message.analysisContext.what_if.improved_score}%)`
                          : ''}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about drops, pacing, hooks..."
            rows={2}
            className={`flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 transition-colors ${
              isDark
                ? 'bg-surface-800 border-surface-700 text-surface-200 placeholder:text-surface-600'
                : 'bg-white border-surface-300 text-surface-700 placeholder:text-surface-400'
            }`}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="h-10 px-3 rounded-lg bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-brand-700 transition-colors"
          >
            {isAsking ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
