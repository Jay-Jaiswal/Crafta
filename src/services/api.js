import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Fetch analysis data from the backend.
 * GET /analysis returns { video_id, status, progress, data }
 * We extract the `data` field for the frontend store.
 */
export const getAnalysis = async (videoId = null) => {
  try {
    const url = videoId ? `/analysis/${videoId}` : '/analysis';
    const response = await api.get(url);
    const result = response.data;

    // If processing, return null (frontend will use dummy data)
    if (result.status !== 'completed' || !result.data) {
      console.info(`Analysis status: ${result.status} (${result.progress}%)`);
      return null;
    }

    return result.data;
  } catch (_error) {
    console.warn('API not available, using dummy data');
    return null;
  }
};

/**
 * Fetch raw analysis status payload.
 * Returns { video_id, status, progress, data, error }
 */
export const getAnalysisStatus = async (videoId) => {
  if (!videoId) return null;
  try {
    const response = await api.get(`/analysis/${videoId}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch analysis status:', error);
    return null;
  }
};

/**
 * Submit feedback on a suggestion.
 * POST /feedback with { video_id, suggestion_id, feedback }
 */
export const postFeedback = async (suggestionId, isAccurate) => {
  try {
    const response = await api.post('/feedback', {
      video_id: 'demo',
      suggestion_id: suggestionId,
      feedback: isAccurate ? 'accurate' : 'not_accurate',
    });
    return response.data;
  } catch (_error) {
    console.warn('Feedback API not available, simulating response');
    return { success: true, message: 'Feedback recorded (simulated)' };
  }
};

/**
 * Upload a video file for analysis.
 * POST /upload with multipart form data.
 */
export const uploadVideo = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300000, // 5 min for large uploads
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

/**
 * Connect to WebSocket for live progress updates.
 */
export const connectProgressWS = (videoId, onMessage) => {
  const normalizedBase = API_BASE.replace(/\/$/, '');
  const wsBase = normalizedBase.startsWith('https://')
    ? normalizedBase.replace('https://', 'wss://')
    : normalizedBase.replace('http://', 'ws://');
  const wsUrl = `${wsBase}/ws/progress/${videoId}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };

  ws.onerror = (error) => {
    console.warn('WebSocket error:', error);
  };

  return ws;
};

/**
 * Ask chatbot a question grounded on analyzed JSON.
 */
export const askChatbot = async (question, videoId = null) => {
  const payload = {
    question,
    video_id: videoId || null,
  };
  const response = await api.post('/chat', payload);
  return response.data;
};

/**
 * Fetch uploaded video history from backend/uploads.
 */
export const getHistoryItems = async () => {
  try {
    const response = await api.get('/history');
    return response.data?.items || [];
  } catch (error) {
    console.error('Failed to fetch history items:', error);
    return [];
  }
};

export default api;
