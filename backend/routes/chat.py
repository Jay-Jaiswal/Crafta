"""Chat route for question-answering over analyzed video JSON."""

from fastapi import APIRouter

from models.schemas import ChatRequest, ChatResponse
from services.chatbot_service import answer_question

router = APIRouter(tags=["Chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    summary="Ask questions about analyzed video",
    description="Answer user questions grounded in saved analysis JSON for a selected or latest video.",
)
async def chat(request: ChatRequest):
    answer, resolved_video_id, source, source_detail, analysis_context = await answer_question(
        question=request.question,
        video_id=request.video_id,
    )
    return ChatResponse(
        answer=answer,
        video_id=resolved_video_id,
        source=source,
        source_detail=source_detail,
        analysis_context=analysis_context,
    )
