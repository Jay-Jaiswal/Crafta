"""
Feedback route — records user feedback on AI suggestions.

POST /feedback
  - Records whether a suggestion was accurate
  - Stores feedback in JSON file per video
  - Returns confirmation

Example curl:
  curl -X POST http://localhost:8000/feedback \
    -H "Content-Type: application/json" \
    -d '{"video_id": "abc123", "suggestion_id": 1, "feedback": "accurate"}'
"""

import logging

from fastapi import APIRouter, HTTPException

from models.schemas import FeedbackRequest, FeedbackResponse, ErrorResponse
from services.storage_service import save_feedback, load_feedback

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Feedback"])


@router.post(
    "/feedback",
    response_model=FeedbackResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid feedback data"},
    },
    summary="Submit feedback on a suggestion",
    description="Record whether an AI suggestion was accurate or not.",
)
async def submit_feedback(request: FeedbackRequest):
    """
    Record user feedback on an AI suggestion.

    This feedback is stored and can be used to improve the model
    in future analysis runs.
    """
    try:
        feedback_entry = {
            "suggestion_id": request.suggestion_id,
            "timestamp": request.timestamp,
            "feedback": request.feedback.value,
            "comment": request.comment,
        }

        await save_feedback(request.video_id, feedback_entry)

        logger.info(
            f"Feedback recorded: video={request.video_id}, "
            f"suggestion={request.suggestion_id}, "
            f"feedback={request.feedback.value}"
        )

        return FeedbackResponse(
            success=True,
            message="Feedback recorded. Model improving.",
        )

    except Exception as e:
        logger.error(f"Feedback save failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to record feedback")


@router.get(
    "/feedback/{video_id}",
    summary="Get feedback history",
    description="Retrieve all feedback entries for a specific video.",
    tags=["Feedback"],
)
async def get_feedback(video_id: str):
    """Retrieve all feedback entries for a video."""
    entries = await load_feedback(video_id)
    return {
        "video_id": video_id,
        "total_entries": len(entries),
        "entries": entries,
    }
