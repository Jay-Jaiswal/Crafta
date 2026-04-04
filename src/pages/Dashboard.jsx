import { useRef, useState } from 'react';
import useStore from '../store/useStore';
import useThemeStore from '../store/useThemeStore';
import SummaryBar from '../components/SummaryBar';
import VideoPlayer from '../components/VideoPlayer';
import AttentionChart from '../components/AttentionChart';
import InsightsPanel from '../components/InsightsPanel';
import SuggestionsPanel from '../components/SuggestionsPanel';
import WhatIfPanel from '../components/WhatIfPanel';
import ChatbotPanel from '../components/ChatbotPanel';
import { AnimatedDownload } from '../components/ui/animated-download.tsx';
import { Progress } from '../components/ui/progress';
import { Upload, LoaderCircle, Video, CheckCircle2 } from 'lucide-react';

const Dashboard = () => {
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
  const { theme } = useThemeStore();
  const isDark = theme === 'dark';
  const isPipelineActive = isUploading || pipelineStatus === 'processing';
  const progressStateLabel = isUploading
    ? 'UPLOADING'
    : pipelineStatus === 'processing'
      ? 'PIPELINE'
      : 'READY';
  const progressValue = isUploading ? 33 : pipelineStatus === 'processing' ? 66 : pipelineStatus === 'completed' ? 100 : 0;

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

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-surface-900'}`}>
            Video Analysis
          </h2>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>
            Upload and analyze videos for engagement intelligence
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
          isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
        }`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Model Active
        </div>
      </div>

      {/* Upload Section */}
      <div className={`card p-5 mb-6 ${isDark ? '' : ''}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/x-msvideo,video/x-matroska,video/webm"
          className="hidden"
          onChange={onFileSelected}
        />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? 'bg-surface-800' : 'bg-surface-100'
            }`}>
              <Upload className={`w-4 h-4 ${isDark ? 'text-surface-400' : 'text-surface-500'}`} />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-surface-900'}`}>Upload Video</p>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-500'}`}>
                MP4, MOV, AVI, MKV, or WEBM for frame-by-frame analysis
              </p>
              {selectedFile && (
                <p className="text-xs text-brand-500 mt-1 font-medium">{selectedFile.name}</p>
              )}
              {activeVideoId && (
                <p className={`text-xs mt-0.5 font-mono ${isDark ? 'text-surface-400' : 'text-surface-400'}`}>
                  ID: {activeVideoId}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openFilePicker}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors ${
                isDark
                  ? 'bg-surface-800 text-surface-200 border-surface-700 hover:bg-surface-700'
                  : 'bg-white text-surface-700 border-surface-300 hover:bg-surface-50'
              }`}
            >
              Choose File
            </button>
            <button
              onClick={onUpload}
              disabled={!selectedFile || isUploading}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isUploading ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {isUploading ? 'Uploading...' : 'Upload & Analyze'}
            </button>
          </div>
        </div>

        {(isUploading || pipelineStatus === 'processing' || pipelineStatus === 'completed') && (
          <div className="mt-4 pt-4 border-t border-surface-200">
            <div className={`flex flex-col items-center justify-center text-center gap-2 ${isDark ? 'text-white' : 'text-surface-900'}`}>
              <AnimatedDownload
                className="max-w-full md:translate-x-10"
                isAnimating={isPipelineActive}
                statusText={progressStateLabel}
                realProgress={isUploading ? uploadProgress : processingProgress}
              />
              <div className="w-full max-w-md px-1">
                <Progress
                  value={progressValue}
                  className={isDark ? 'bg-surface-700/80' : 'bg-surface-200'}
                  indicatorClassName="bg-brand-600"
                  aria-label="Pipeline progress"
                />
              </div>
              {processingStage && pipelineStatus === 'processing' && (
                <p className={`text-xs ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>
                  {processingStage}
                </p>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className={`mt-4 p-3 rounded-lg text-xs ${isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}
      </div>

      {/* Summary Bar */}
      {data ? (
        <div className="mb-6">
          <SummaryBar />
        </div>
      ) : (
        <div className={`card p-5 mb-6 flex items-center gap-3 ${isDark ? '' : ''}`}>
          <Video className={`w-5 h-5 ${isDark ? 'text-surface-600' : 'text-surface-400'}`} />
          <div>
            <p className={`text-sm font-medium ${isDark ? 'text-surface-300' : 'text-surface-700'}`}>No analysis loaded</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-surface-500' : 'text-surface-400'}`}>Upload a video above to get started</p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5">
          <VideoPlayer />
        </div>

        <div className="xl:col-span-4">
          <AttentionChart />
        </div>

        <div className="xl:col-span-3">
          <InsightsPanel />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 mt-5">
        <div className="xl:col-span-8">
          <SuggestionsPanel />
        </div>

        <div className="xl:col-span-4 space-y-5">
          <WhatIfPanel />
          <ChatbotPanel />
        </div>
      </div>

      {/* Footer */}
      <footer className={`mt-8 pt-4 border-t flex items-center justify-between ${isDark ? 'border-surface-800' : 'border-surface-200'}`}>
        <p className={`text-xs ${isDark ? 'text-surface-600' : 'text-surface-400'}`}>
          Consumer Attention Analyzer v1.0
        </p>
        <div className="flex items-center gap-1">
          {['Video', 'Features', 'Attention', 'Drops', 'Insights'].map((step, i) => (
            <span key={step} className="flex items-center">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                isDark ? 'text-surface-500 bg-surface-800' : 'text-surface-500 bg-surface-100'
              }`}>
                {step}
              </span>
              {i < 4 && <span className={`text-[10px] mx-0.5 ${isDark ? 'text-surface-700' : 'text-surface-300'}`}>→</span>}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
