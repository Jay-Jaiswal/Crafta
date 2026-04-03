"""
Upload route — handles video file uploads and triggers background processing.

POST /upload
  - Accepts multipart video file (mp4, mov, avi, mkv, webm)
  - Validates format and size
  - Saves to /uploads/{video_id}/
  - Starts background analysis pipeline
  - Returns video_id + status immediately (non-blocking)

Example curl:
  curl -X POST http://localhost:8000/upload \
    -F "file=@video.mp4"
"""

import logging

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException

from models.schemas import UploadResponse, ProcessingStatus, ErrorResponse
from services.video_service import save_video, VideoValidationError
from services.pipeline_service import run_full_pipeline, set_progress

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Upload"])


@router.post(
    "/upload",
    response_model=UploadResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid video file"},
        413: {"model": ErrorResponse, "description": "File too large"},
    },
    summary="Upload a video for analysis",
    description="Upload a video file to start the AI attention analysis pipeline.",
)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Video file (mp4, mov, avi, mkv, webm)"),
):
    """
    Upload a video and start background processing.

    The upload is non-blocking — the video is saved and the analysis pipeline
    runs in the background. Use GET /analysis/{video_id} to poll for results.
    """
    try:
        # Validate and save
        video_id, video_path = await save_video(file)

        # Mark as queued
        set_progress(video_id, "processing", 5, "Upload complete, queuing pipeline")

        # Start background processing (non-blocking)
        background_tasks.add_task(_run_pipeline_safe, video_id, video_path)

        logger.info(f"Upload accepted: {video_id} ({file.filename})")

        return UploadResponse(
            video_id=video_id,
            status=ProcessingStatus.PROCESSING,
            message=f"Video uploaded successfully. Processing started.",
        )

    except VideoValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error during upload")


async def _run_pipeline_safe(video_id: str, video_path):
    """Wrapper to catch pipeline errors without crashing the server."""
    try:
        await run_full_pipeline(video_id, video_path)
    except Exception as e:
        logger.error(f"[{video_id}] Pipeline failed in background: {e}", exc_info=True)
        set_progress(video_id, "failed", 0, f"Pipeline error: {str(e)[:100]}")
