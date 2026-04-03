"""
Consumer Attention Analyzer — FastAPI Backend

Production-ready AI video analysis service that accepts video uploads,
processes them through a feature extraction → attention scoring pipeline,
and returns structured insights for the frontend dashboard.

Run:
  cd backend
  uvicorn main:app --reload --port 8000

Or:
  python main.py
"""

import time
import logging
from pathlib import Path
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routes import upload, analysis, feedback, chat
from services.pipeline_service import subscribe_ws, unsubscribe_ws, get_progress
from utils.file_utils import ensure_directories, UPLOADS_DIR

# Load backend environment variables from backend/.env.
# override=True ensures stale OS/user-level env values do not shadow the active project key.
load_dotenv(Path(__file__).resolve().parent / ".env", override=True)

# ─── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)-24s │ %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("attention-analyzer")

# ─── App startup time (for health endpoint) ──────────────────────────────────

_start_time = time.time()


# ─── Lifespan (startup/shutdown) ──────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs on startup and shutdown."""
    # Startup
    logger.info("=" * 60)
    logger.info("  Consumer Attention Analyzer — Starting up")
    logger.info("=" * 60)
    ensure_directories()
    logger.info("Directories initialized")
    logger.info("Backend ready at http://localhost:8000")
    logger.info("API docs at http://localhost:8000/docs")

    yield  # App runs here

    # Shutdown
    logger.info("Shutting down...")


# ─── App Instance ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Consumer Attention Analyzer",
    description=(
        "AI-Powered Video Engagement Intelligence API. "
        "Analyzes videos to predict attention drops and generate "
        "actionable suggestions for improving viewer retention."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# ─── CORS ─────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # Next.js dev
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Static file serving (uploaded videos) ───────────────────────────────────

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")


# ─── Register Routes ─────────────────────────────────────────────────────────

app.include_router(upload.router)
app.include_router(analysis.router)
app.include_router(feedback.router)
app.include_router(chat.router)


# ─── Root & Health ────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint — service info."""
    return {
        "service": "Consumer Attention Analyzer",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - _start_time, 1),
    }


# ─── WebSocket for live progress updates ─────────────────────────────────────

@app.websocket("/ws/progress/{video_id}")
async def websocket_progress(websocket: WebSocket, video_id: str):
    """
    WebSocket endpoint for live processing progress.

    Connect to receive real-time updates during video analysis:
      ws://localhost:8000/ws/progress/{video_id}

    Messages are JSON:
      {"status": "processing", "progress": 42, "stage": "Detecting faces..."}
    """
    await websocket.accept()
    subscribe_ws(video_id, websocket)
    logger.info(f"WebSocket connected: {video_id}")

    try:
        # Send current progress immediately
        import json
        current = get_progress(video_id)
        await websocket.send_text(json.dumps(current))

        # Keep connection alive until client disconnects
        while True:
            # Wait for any message from client (ping/pong keepalive)
            data = await websocket.receive_text()
            # Echo current progress on any client message
            current = get_progress(video_id)
            await websocket.send_text(json.dumps(current))

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {video_id}")
    finally:
        unsubscribe_ws(video_id, websocket)


# ─── Run with Uvicorn ────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
