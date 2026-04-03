import { create } from 'zustand';
import { connectProgressWS, getAnalysisStatus, uploadVideo } from '../services/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeText = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const normalizeAnalysisData = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;

  const rawInsights = Array.isArray(payload.insights) ? payload.insights : [];
  const insightSeen = new Set();
  const insights = [];
  for (const item of rawInsights) {
    const key = `${normalizeText(item?.title)}|${normalizeText(item?.description)}`;
    if (!normalizeText(item?.title) || insightSeen.has(key)) continue;
    insightSeen.add(key);
    insights.push(item);
  }

  const rawSuggestions = Array.isArray(payload.suggestions) ? payload.suggestions : [];
  const seen = new Set();
  const suggestions = [];
  for (const item of rawSuggestions) {
    const key = normalizeText(item?.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      ...item,
      jump_to: item?.jump_to ?? item?.jumpTo ?? 0,
      alternatives: Array.isArray(item?.alternatives) ? item.alternatives : [],
    });
    if (suggestions.length >= 5) break;
  }

  return {
    ...payload,
    insights,
    suggestions,
    what_if: payload.what_if ?? payload.whatIf ?? null,
  };
};

const useStore = create((set, get) => ({
  // Data
  data: null,
  isLoading: false,
  error: null,
  activeVideoId: null,
  pipelineStatus: 'idle',
  uploadProgress: 0,
  processingProgress: 0,
  processingStage: '',
  isUploading: false,

  // Video state
  currentTime: 0,
  isPlaying: false,
  videoDuration: 60,

  // UI state
  activeInsight: null,
  activeSuggestion: null,
  highlightedSegment: null,
  whatIfEnabled: false,
  feedbackMap: {},

  // Actions
  fetchData: async () => {
    set({ isLoading: false, error: null });
  },

  uploadAndAnalyze: async (file) => {
    if (!file) return;

    let ws = null;
    set({
      error: null,
      isUploading: true,
      uploadProgress: 0,
      processingProgress: 0,
      processingStage: 'Uploading video',
      pipelineStatus: 'processing',
    });

    try {
      const uploadRes = await uploadVideo(file, (progress) => {
        set({ uploadProgress: progress });
      });

      const videoId = uploadRes?.video_id;
      if (!videoId) throw new Error('Upload response did not include video_id');

      set({
        activeVideoId: videoId,
        isUploading: false,
        processingProgress: 5,
        processingStage: 'Upload complete, pipeline started',
      });

      ws = connectProgressWS(videoId, (message) => {
        set({
          pipelineStatus: message?.status || 'processing',
          processingProgress: Number(message?.progress || 0),
          processingStage: message?.stage || '',
        });
      });

      const maxAttempts = 240;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const statusPayload = await getAnalysisStatus(videoId);
        if (statusPayload) {
          set({
            pipelineStatus: statusPayload.status || 'processing',
            processingProgress: Number(statusPayload.progress || 0),
            processingStage: statusPayload.error || statusPayload.stage || '',
          });

          if (statusPayload.status === 'completed' && statusPayload.data) {
            const normalizedData = normalizeAnalysisData(statusPayload.data);
            set({
              data: normalizedData,
              isLoading: false,
              error: null,
              videoDuration: normalizedData.video_duration || 60,
              currentTime: 0,
              isPlaying: false,
              processingProgress: 100,
              processingStage: 'Analysis complete',
              pipelineStatus: 'completed',
            });
            ws?.close();
            return;
          }

          if (statusPayload.status === 'failed') {
            throw new Error(statusPayload.error || 'Pipeline failed');
          }
        }

        await sleep(1500);
      }

      throw new Error('Analysis timed out. Please try again with a shorter video.');
    } catch (error) {
      ws?.close();
      set({
        isUploading: false,
        pipelineStatus: 'failed',
        error: error?.response?.data?.detail || error?.message || 'Upload failed',
      });
    }
  },

  clearError: () => set({ error: null }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVideoDuration: (duration) => set({ videoDuration: duration }),

  setActiveInsight: (insight) => {
    const current = get().activeInsight;
    set({
      activeInsight: current?.id === insight?.id ? null : insight,
      highlightedSegment: insight ? { start: insight.start, end: insight.end } : null,
    });
  },

  setActiveSuggestion: (suggestion) => {
    set({ activeSuggestion: suggestion });
  },

  setHighlightedSegment: (segment) => set({ highlightedSegment: segment }),

  toggleWhatIf: () => set((state) => ({ whatIfEnabled: !state.whatIfEnabled })),

  recordFeedback: (suggestionId, isAccurate) => {
    set((state) => ({
      feedbackMap: { ...state.feedbackMap, [suggestionId]: isAccurate },
    }));
  },

  // Computed helpers
  getScoreAtTime: (time) => {
    const { data } = get();
    if (!data) return 0;
    const scores = data.attention_scores;
    const closest = scores.reduce((prev, curr) =>
      Math.abs(curr.time - time) < Math.abs(prev.time - time) ? curr : prev
    );
    return closest.score;
  },

  getSegmentAtTime: (time) => {
    const { data } = get();
    if (!data) return null;
    return data.segments.find(s => time >= s.start && time < s.end) || null;
  },

  getDropAtTime: (time) => {
    const { data } = get();
    if (!data) return null;
    return data.drops.find(d => time >= d.start && time <= d.end) || null;
  },
}));

export default useStore;
