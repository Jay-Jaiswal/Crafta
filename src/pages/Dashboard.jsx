import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import useStore from '../store/useStore';
import SummaryBar from '../components/SummaryBar';
import VideoPlayer from '../components/VideoPlayer';
import AttentionChart from '../components/AttentionChart';
import InsightsPanel from '../components/InsightsPanel';
import SuggestionsPanel from '../components/SuggestionsPanel';
import WhatIfPanel from '../components/WhatIfPanel';
import { Activity, Upload, LoaderCircle } from 'lucide-react';

const Dashboard = () => {
  const isLoading = useStore((s) => s.isLoading);
  const data = useStore((s) => s.data);
  const uploadAndAnalyze = useStore((s) => s.uploadAndAnalyze);
  const isUploading = useStore((s) => s.isUploading);
  const uploadProgress = useStore((s) => s.uploadProgress);
  const processingProgress = useStore((s) => s.processingProgress);
  const processingStage = useStore((s) => s.processingStage);
  const pipelineStatus = useStore((s) => s.pipelineStatus);
  const activeVideoId = useStore((s) => s.activeVideoId);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);

  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    clearError();
  };

  const onUpload = () => {
    if (!selectedFile || isUploading) return;
    uploadAndAnalyze(selectedFile);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <LoaderCircle className="w-10 h-10 text-accent-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 relative">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-accent-purple/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-accent-blue/[0.02] rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent-cyan/[0.01] rounded-full blur-[200px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-4 lg:px-6 py-4">
        {/* Top Nav */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                Consumer Attention Analyzer
              </h1>
              <p className="text-[11px] text-slate-500">
                AI-Powered Video Engagement Intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-700/50 border border-white/[0.04]">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-1.5 h-1.5 rounded-full bg-success"
              />
              <span className="text-[11px] text-slate-400">Model Active</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-purple/30 to-accent-blue/30 border border-white/10 flex items-center justify-center">
              <span className="text-xs font-bold text-white">AI</span>
            </div>
          </div>
        </motion.header>

        {/* Upload Section */}
        <div className="mb-5 glass-card p-4 border border-white/[0.06]">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
            className="hidden"
            onChange={onFileSelected}
          />

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Upload Video</p>
              <p className="text-xs text-slate-500">
                Upload MP4, MOV, AVI, MKV, or WEBM to trigger frame-by-frame pipeline extraction.
              </p>
              {selectedFile && (
                <p className="text-xs text-accent-cyan mt-1">Selected: {selectedFile.name}</p>
              )}
              {activeVideoId && (
                <p className="text-xs text-slate-400 mt-1">Video ID: {activeVideoId}</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={openFilePicker}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-dark-700/70 text-slate-200 border border-white/[0.08] hover:bg-dark-600/70 transition-colors"
              >
                Choose File
              </button>
              <button
                onClick={onUpload}
                disabled={!selectedFile || isUploading}
                className="px-3 py-2 text-xs font-semibold rounded-lg bg-accent-purple/25 text-accent-purple border border-accent-purple/30 hover:bg-accent-purple/35 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isUploading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {isUploading ? 'Uploading...' : 'Upload & Analyze'}
              </button>
            </div>
          </div>

          {(isUploading || pipelineStatus === 'processing' || pipelineStatus === 'completed') && (
            <div className="mt-3 space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Upload Progress</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-dark-600/70 overflow-hidden">
                  <div className="h-full bg-accent-blue" style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span>Pipeline Progress</span>
                  <span>{Math.round(processingProgress)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-dark-600/70 overflow-hidden">
                  <div className="h-full bg-accent-purple" style={{ width: `${Math.max(0, Math.min(100, processingProgress))}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {processingStage || (pipelineStatus === 'completed' ? 'Analysis complete' : 'Processing...')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <p className="mt-2 text-xs text-danger-soft">{error}</p>
          )}
        </div>

        {/* Summary Bar */}
        {data ? (
          <div className="mb-5">
            <SummaryBar />
          </div>
        ) : (
          <div className="mb-5 glass-card p-4 border border-white/[0.06]">
            <p className="text-sm text-slate-300">No analysis loaded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Upload a video above to generate real pipeline output.</p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Video Player */}
          <div className="lg:col-span-5">
            <VideoPlayer />
          </div>

          {/* Center Column: Attention Chart */}
          <div className="lg:col-span-4">
            <AttentionChart />
          </div>

          {/* Right Column: Insights */}
          <div className="lg:col-span-3">
            <InsightsPanel />
          </div>
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
          {/* Suggestions */}
          <div className="lg:col-span-8">
            <SuggestionsPanel />
          </div>

          {/* What If */}
          <div className="lg:col-span-4">
            <WhatIfPanel />
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 pb-4 flex items-center justify-between"
        >
          <p className="text-[10px] text-slate-700">
            Consumer Attention Analyzer v1.0 — Powered by Multi-Modal AI
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-700">Pipeline:</span>
            {['Video', 'Features', 'Attention', 'Drops', 'Insights'].map((step, i) => (
              <span key={step} className="flex items-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 + i * 0.1 }}
                  className="text-[10px] text-slate-600 px-1.5 py-0.5 rounded bg-dark-700/30"
                >
                  {step}
                </motion.span>
                {i < 4 && <span className="text-[10px] text-slate-700 mx-0.5">→</span>}
              </span>
            ))}
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Dashboard;
