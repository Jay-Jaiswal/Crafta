# Consumer Attention Analyzer

Consumer Attention Analyzer is a full-stack project that analyzes uploaded videos and predicts attention drop zones, engagement segments, and actionable editing suggestions.

The project includes:
- A React + Vite dashboard frontend
- A FastAPI backend with upload, analysis, feedback, and WebSocket progress endpoints
- A simulated AI pipeline for feature extraction and attention scoring

## Project Structure

- `src/` - Frontend dashboard
- `backend/` - FastAPI backend service
- `backend/uploads/` - Uploaded video files
- `backend/results/` - Generated analysis results
- `backend/feedback/` - Stored user feedback entries

## Requirements

- Node.js 18+
- Python 3.11+

## Setup

### 1. Install frontend dependencies

From project root:

```bash
npm install
```

### 2. Install backend dependencies

From `backend/`:

```bash
pip install -r requirements.txt
```

## Run In Development

### Start backend

From `backend/`:

```bash
uvicorn main:app --reload --port 8000
```

Backend URLs:
- API root: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Start frontend

From project root:

```bash
npm run dev
```

Frontend URL:
- Dashboard: `http://localhost:5173`

## Build And Quality Checks

From project root:

```bash
npm run lint
npm run build
```

## Backend API Overview

- `POST /upload`
	Upload a video and start background analysis.

- `GET /analysis/{video_id}`
	Get analysis progress or completed result for an uploaded video.

- `GET /analysis`
	Get demo analysis data (no upload required).

- `POST /feedback`
	Submit feedback for suggestions.

- `GET /feedback/{video_id}`
	Retrieve saved feedback entries.

- `GET /health`
	Service health check.

- `WS /ws/progress/{video_id}`
	Live processing progress updates.

## Environment Variables

Frontend:
- `VITE_API_BASE` (optional) default is `http://localhost:8000`

Example:

```bash
VITE_API_BASE=http://localhost:8000
```

## Current Status

- Frontend linting passes
- Frontend production build passes
- Backend Python files compile successfully
- End-to-end demo flow works using `GET /analysis` fallback data
