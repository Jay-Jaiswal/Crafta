import { useState } from 'react';
import { MessageCircle, Send, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import { askChatbot } from '../services/api';

const reasonLabel = {
  gemini_ok: 'Gemini response',
  rate_limited: 'Gemini rate limited (429)',
  model_not_found: 'Gemini model not found (404)',
  auth_error: 'Gemini auth error',
  timeout: 'Gemini timeout',
  network_error: 'Network error',
  no_api_key: 'No Gemini API key',
  no_analysis: 'No analysis available',
  analysis_not_found: 'Analysis file missing',
  gemini_failed: 'Gemini request failed',
};

const sourceStyles = {
  gemini: 'bg-success/10 text-success border-success/30',
  fallback: 'bg-warning/10 text-warning border-warning/30',
  error: 'bg-danger-soft/10 text-danger-soft border-danger-soft/30',
  system: 'bg-dark-700/40 text-slate-400 border-white/[0.06]',
};

const ChatbotPanel = () => {
  const activeVideoId = useStore((s) => s.activeVideoId);
  const data = useStore((s) => s.data);

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Ask me anything about your analyzed video. I will answer from the generated JSON data.',
      source: 'system',
      sourceDetail: 'ready',
    },
  ]);

  const handleAsk = async () => {
    const trimmed = question.trim();
    if (!trimmed || isAsking) return;

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
          sourceDetail: result?.source_detail || 'gemini_failed',
          videoId: result?.video_id || 'none',
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Chat request failed: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`,
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.65 }}
      className="glass-card overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Analysis Chatbot
          </span>
        </div>
        <span className="text-[10px] text-slate-600 bg-dark-600 px-2 py-0.5 rounded-full">
          {activeVideoId || 'latest'}
        </span>
      </div>

      <div className="p-3 space-y-3">
        {!data && (
          <div className="text-xs text-slate-500 rounded-lg border border-warning/20 bg-warning/5 px-3 py-2">
            Upload and analyze a video first. Chat will use the latest analysis JSON if no video id is active.
          </div>
        )}

        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`rounded-xl px-3 py-2 text-xs leading-relaxed border ${
                message.role === 'user'
                  ? 'bg-accent-purple/15 border-accent-purple/30 text-slate-100'
                  : 'bg-dark-700/50 border-white/[0.08] text-slate-300'
              }`}
            >
              <p>{message.text}</p>
              {message.role === 'assistant' && message.source && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${sourceStyles[message.source] || sourceStyles.system}`}>
                    {message.source}
                  </span>
                  {message.sourceDetail && (
                    <span className="text-[10px] text-slate-500">
                      {reasonLabel[message.sourceDetail] || message.sourceDetail}
                    </span>
                  )}
                  {message.videoId && (
                    <span className="text-[10px] text-slate-500">video: {message.videoId}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about drops, pacing, hooks, or exact segments..."
            rows={2}
            className="flex-1 resize-none rounded-lg bg-dark-700/50 border border-white/[0.08] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-accent-purple/40"
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            className="h-9 px-3 rounded-lg bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isAsking ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span className="text-xs font-medium">Ask</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatbotPanel;
