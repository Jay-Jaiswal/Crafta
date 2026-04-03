import { useState } from 'react';
import { MessageCircle, Send, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import { askChatbot } from '../services/api';

const reasonLabel = {
  groq_ok: 'Groq response',
  rate_limited: 'Groq rate limited',
  model_not_found: 'Groq model not found',
  auth_error: 'Groq auth error',
  timeout: 'Groq timeout',
  network_error: 'Network error',
  no_api_key: 'No Groq API key',
  no_analysis: 'No analysis available',
  analysis_not_found: 'Analysis file missing',
  groq_failed: 'Groq request failed',
};

const sourceStyles = {
  groq: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  fallback: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
  system: 'bg-surface-100 text-surface-500 border-surface-200',
};

const promptSuggestions = [
  {
    text: 'How can I improve the first 10 seconds?',
    keywords: ['improve', 'first', '10', 'seconds', 'hook', 'intro', 'opening'],
  },
  {
    text: 'Why did people drop off at 25s?',
    keywords: ['drop', 'dropoff', 'drop-off', '25', 'seconds', 'retention', 'leave'],
  },
  {
    text: "What is the best part of my video?",
    keywords: ['best', 'part', 'strong', 'high', 'engagement', 'segment'],
  },
  {
    text: 'How do I fix the audio issue?',
    keywords: ['audio', 'sound', 'voice', 'music', 'noise', 'issue'],
  },
];

const ChatbotPanel = () => {
  const activeVideoId = useStore((s) => s.activeVideoId);
  const data = useStore((s) => s.data);
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [hasChattedOnce, setHasChattedOnce] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask me anything about your analyzed video.',
      source: 'system',
      sourceDetail: 'ready',
    },
  ]);

  const normalizedQuestion = question.trim().toLowerCase();
  const matchedSuggestions = normalizedQuestion
    ? promptSuggestions.filter((item) => {
        const textMatch = item.text.toLowerCase().includes(normalizedQuestion);
        const keywordMatch = item.keywords.some((kw) =>
          normalizedQuestion.includes(kw) || kw.includes(normalizedQuestion)
        );
        return textMatch || keywordMatch;
      })
    : promptSuggestions;

  const shouldShowSuggestions = !hasChattedOnce && matchedSuggestions.length > 0;
  const activeSuggestions = shouldShowSuggestions ? matchedSuggestions : [];

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

    setHasChattedOnce(true);

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setQuestion('');
    setIsAsking(true);

    try {
      const result = await askChatbot(trimmed, activeVideoId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result?.answer || 'No response generated.',
          source: result?.source || 'fallback',
          sourceDetail: result?.source_detail || 'groq_failed',
          videoId: result?.video_id || 'none',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Request failed: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`,
          source: 'error',
          sourceDetail: 'request_error',
        },
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
          <span className={`text-[10px] font-mono ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
            {activeVideoId.slice(0, 12)}
          </span>
        )}
      </div>

      <div className="p-3 space-y-3">
        {!data && (
          <div className={`text-xs rounded-lg border px-3 py-2 ${isDark ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
            Upload and analyze a video first.
          </div>
        )}

        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-lg px-3 py-2 text-xs leading-relaxed border ${
                message.role === 'user'
                  ? isDark
                    ? 'bg-brand-500/10 border-brand-500/20 text-surface-100'
                    : 'bg-brand-50 border-brand-200 text-surface-800'
                  : isDark
                  ? 'bg-surface-800/50 border-transparent text-surface-300'
                  : 'bg-surface-50 border-transparent text-surface-600'
              }`}
            >
              <p className="whitespace-pre-line">{message.text}</p>
              {message.role === 'assistant' && message.source && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${sourceStyles[message.source] || sourceStyles.system}`}>
                    {message.source}
                  </span>
                  {message.sourceDetail && (
                    <span className={`text-[10px] ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
                      {reasonLabel[message.sourceDetail] || message.sourceDetail}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {activeSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeSuggestions.map((item) => (
              <button
                key={item.text}
                type="button"
                onClick={() => {
                  setQuestion(item.text);
                }}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isDark
                    ? 'bg-surface-800/70 border-surface-700 text-surface-300 hover:bg-surface-700'
                    : 'bg-white border-surface-200 text-surface-600 hover:bg-surface-50'
                }`}
              >
                {item.text}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            onKeyDown={onKeyDown}
            placeholder="Ask about drops, pacing, hooks..."
            rows={2}
            className={`flex-1 resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500/30 focus:border-brand-500 transition-colors ${
              isDark
                ? 'bg-surface-800 border-surface-700 text-surface-200 placeholder:text-surface-600'
                : 'bg-white border-surface-300 text-surface-700 placeholder:text-surface-400'
            }`}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="h-9 px-3 rounded-lg bg-brand-600 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 hover:bg-brand-700 transition-colors"
          >
            {isAsking ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
