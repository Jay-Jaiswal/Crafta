"""
Pydantic models for the Consumer Attention Analyzer API.

Defines request/response schemas for upload, analysis, and feedback endpoints.
All models use strict validation with clear documentation.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class ProcessingStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FeedbackType(str, Enum):
    ACCURATE = "accurate"
    NOT_ACCURATE = "not_accurate"


class DropSeverity(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class SegmentType(str, Enum):
    HIGH = "high"
    RISK = "risk"
    LOW = "low"


class SuggestionTag(str, Enum):
    HOOK_WEAK = "Hook Weak"
    TOO_SLOW = "Too Slow"
    REPETITIVE = "Repetitive"


# ─── Sub-models ───────────────────────────────────────────────────────────────

class AttentionScore(BaseModel):
    time: float = Field(..., ge=0, description="Timestamp in seconds")
    score: float = Field(..., ge=0, le=100, description="Attention score 0-100")
    label: str = Field(default="", description="Optional label for this data point")


class Drop(BaseModel):
    id: int
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)
    reason: str
    severity: DropSeverity
    confidence: float = Field(..., ge=0, le=100)
    details: str = ""


class Segment(BaseModel):
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)
    type: SegmentType
    label: str
    score: float = Field(..., ge=0, le=100)


class Insight(BaseModel):
    id: int
    icon: str
    title: str
    description: str
    timeRange: str = Field(..., alias="time_range", serialization_alias="timeRange")
    start: float = Field(..., ge=0)
    end: float = Field(..., ge=0)
    confidence: float = Field(..., ge=0, le=100)
    severity: DropSeverity

    class Config:
        populate_by_name = True


class Suggestion(BaseModel):
    id: int
    text: str
    confidence: float = Field(..., ge=0, le=100)
    tag: SuggestionTag
    jumpTo: float = Field(..., ge=0, alias="jump_to", serialization_alias="jumpTo")
    impact: str

    class Config:
        populate_by_name = True


class TrimmedSegment(BaseModel):
    start: float
    end: float
    label: str


class WhatIf(BaseModel):
    originalScore: float = Field(..., alias="original_score", serialization_alias="originalScore")
    improvedScore: float = Field(..., alias="improved_score", serialization_alias="improvedScore")
    improvement: float
    trimmedSegments: list[TrimmedSegment] = Field(
        ..., alias="trimmed_segments", serialization_alias="trimmedSegments"
    )
    description: str

    class Config:
        populate_by_name = True


# ─── API Request Models ──────────────────────────────────────────────────────

class FeedbackRequest(BaseModel):
    """POST /feedback request body."""
    video_id: str = Field(..., min_length=1, description="Video identifier")
    suggestion_id: Optional[int] = Field(None, description="Suggestion ID if applicable")
    timestamp: Optional[float] = Field(None, ge=0, description="Timestamp in video")
    feedback: FeedbackType
    comment: Optional[str] = Field(None, max_length=500)


# ─── API Response Models ─────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    """POST /upload response."""
    video_id: str
    status: ProcessingStatus
    message: str = "Video uploaded and processing started"


class AnalysisData(BaseModel):
    """Core analysis payload returned by the analysis endpoint."""
    video_url: str
    video_duration: float
    overall_score: float
    total_views: int
    avg_watch_time: str
    completion_rate: str
    summary: str
    attention_scores: list[AttentionScore]
    drops: list[Drop]
    segments: list[Segment]
    insights: list[Insight]
    suggestions: list[Suggestion]
    whatIf: Optional[WhatIf] = Field(None, alias="what_if", serialization_alias="whatIf")
    pipeline_preview: list[dict[str, Any]] = Field(default_factory=list)

    class Config:
        populate_by_name = True


class AnalysisResponse(BaseModel):
    """GET /analysis/{video_id} response."""
    video_id: str
    status: ProcessingStatus
    progress: int = Field(..., ge=0, le=100)
    data: Optional[AnalysisData] = None
    error: Optional[str] = None


class FeedbackResponse(BaseModel):
    """POST /feedback response."""
    success: bool
    message: str


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime_seconds: float


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)
    video_id: Optional[str] = Field(None, description="Optional video id to target a specific analysis")


class ChatResponse(BaseModel):
    answer: str
    video_id: str
    source: str = Field(..., description="groq or fallback")
    source_detail: Optional[str] = Field(None, description="Extra source context such as rate_limited, model_not_found, no_api_key")
