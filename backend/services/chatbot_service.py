"""Chatbot service grounded in saved analysis JSON."""

from __future__ import annotations

import json
import logging
import os
from urllib import error as url_error
from urllib import request as url_request

from utils.file_utils import RESULTS_DIR
from services.storage_service import load_analysis

GEMINI_CHAT_MODEL = os.getenv("GEMINI_CHAT_MODEL", os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
GROQ_CHAT_MODEL = os.getenv("GROQ_CHAT_MODEL", "llama-3.3-70b-versatile")
logger = logging.getLogger(__name__)


def _find_latest_video_id() -> str | None:
    if not RESULTS_DIR.exists():
        return None

    latest_dir = None
    latest_mtime = -1.0
    for child in RESULTS_DIR.iterdir():
        if not child.is_dir():
            continue
        analysis_path = child / "analysis.json"
        if not analysis_path.is_file():
            continue
        mtime = analysis_path.stat().st_mtime
        if mtime > latest_mtime:
            latest_mtime = mtime
            latest_dir = child

    return latest_dir.name if latest_dir else None


def _fallback_answer(question: str, analysis: dict, video_id: str) -> str:
    drops = analysis.get("drops", [])
    summary = analysis.get("summary", "No summary available.")
    top_drop = drops[0] if drops else None

    if top_drop:
        return (
            f"Based on your analysis for video {video_id}: {summary} "
            f"Top issue is between {int(top_drop.get('start', 0))}s and {int(top_drop.get('end', 0))}s "
            f"with reason '{top_drop.get('reason', 'unknown')}'. "
            "Try reducing repetition, improving motion transitions, and strengthening focal subject clarity in that segment."
        )

    return (
        f"Based on your analysis for video {video_id}: {summary} "
        "No strong drop windows detected; maintain pacing consistency and test alternate hooks in the first 3 seconds."
    )


def _build_prompt(question: str, analysis: dict, video_id: str) -> str:
    compact = {
        "video_id": video_id,
        "overall_score": analysis.get("overall_score"),
        "summary": analysis.get("summary"),
        "drops": analysis.get("drops", [])[:5],
        "insights": analysis.get("insights", [])[:8],
        "suggestions": analysis.get("suggestions", [])[:8],
        "attention_scores": analysis.get("attention_scores", [])[:30],
    }

    return (
        "You are a video quality and engagement assistant. "
        "Answer only using the provided analysis JSON evidence. "
        "If evidence is insufficient, say that explicitly and give best next checks.\n\n"
        f"Question: {question}\n\n"
        f"Analysis JSON: {json.dumps(compact, ensure_ascii=True)}"
    )


def _reason_from_error(exc: Exception) -> str:
    if isinstance(exc, url_error.HTTPError):
        if exc.code == 429:
            return "rate_limited"
        if exc.code == 404:
            return "model_not_found"
        if exc.code in (401, 403):
            return "auth_error"
        return f"http_{exc.code}"
    if isinstance(exc, TimeoutError):
        return "timeout"
    if isinstance(exc, url_error.URLError):
        return "network_error"
    if isinstance(exc, json.JSONDecodeError):
        return "invalid_response"
    return "unknown_error"


def _extract_http_error_message(exc: url_error.HTTPError) -> str:
    try:
        body = exc.read().decode("utf-8", errors="ignore")
        if not body:
            return ""
        payload = json.loads(body)
        error_obj = payload.get("error", {}) if isinstance(payload, dict) else {}
        msg = error_obj.get("message") or error_obj.get("error")
        return str(msg or body)
    except Exception:
        return ""


def _call_gemini_chat(question: str, analysis: dict, video_id: str) -> tuple[str | None, str | None]:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        return None, "no_api_key"

    prompt = _build_prompt(question, analysis, video_id)
    model_candidates = [
        GEMINI_CHAT_MODEL,
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash",
    ]

    seen = set()
    ordered_models = []
    for model in model_candidates:
        name = (model or "").strip()
        if name and name not in seen:
            ordered_models.append(name)
            seen.add(name)

    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 600,
        },
    }

    for model_name in ordered_models:
        endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        req = url_request.Request(
            endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            logger.info("Using Gemini chat model=%s for analysis QA", model_name)
            with url_request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")
            payload = json.loads(raw)
            candidates = payload.get("candidates", [])
            if not candidates:
                continue
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts:
                continue
            text = str(parts[0].get("text", "")).strip()
            if text:
                logger.info("Gemini chat answer generated successfully (model=%s)", model_name)
                return text, "gemini_ok"
        except (url_error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("Gemini chat failed for model=%s: %s", model_name, exc)
            last_reason = _reason_from_error(exc)
            continue

    return None, locals().get("last_reason", "gemini_failed")


def _call_groq_chat(question: str, analysis: dict, video_id: str) -> tuple[str | None, str | None]:
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        return None, "no_api_key"

    model_candidates = [
        (GROQ_CHAT_MODEL or "").strip(),
        "llama-3.1-8b-instant",
        "llama-3.3-70b-versatile",
    ]
    ordered_models = []
    seen = set()
    for model in model_candidates:
        if model and model not in seen:
            ordered_models.append(model)
            seen.add(model)

    prompt = _build_prompt(question, analysis, video_id)
    last_reason = "groq_failed"

    for model_name in ordered_models:
        body = {
            "model": model_name,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a video quality and engagement assistant. "
                        "Answer only from provided analysis JSON evidence."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 600,
        }

        req = url_request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )

        try:
            logger.info("Using Groq chat model=%s for analysis QA", model_name)
            with url_request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8")

            payload = json.loads(raw)
            choices = payload.get("choices", [])
            if not choices:
                last_reason = "invalid_response"
                continue

            content = str(choices[0].get("message", {}).get("content", "")).strip()
            if not content:
                last_reason = "invalid_response"
                continue

            logger.info("Groq chat answer generated successfully (model=%s)", model_name)
            return content, "groq_ok"
        except url_error.HTTPError as exc:
            message = _extract_http_error_message(exc).lower()
            logger.warning("Groq chat failed for model=%s: HTTP %s %s", model_name, exc.code, message or exc)

            if exc.code == 429:
                last_reason = "rate_limited"
                continue

            if exc.code in (400, 403, 404) and ("model" in message or "not found" in message or "do not have access" in message):
                last_reason = "model_not_found"
                continue

            if exc.code in (401, 403):
                return None, "auth_error"

            last_reason = f"http_{exc.code}"
            continue
        except (url_error.URLError, TimeoutError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("Groq chat failed for model=%s: %s", model_name, exc)
            last_reason = _reason_from_error(exc)
            continue

    return None, last_reason


async def answer_question(question: str, video_id: str | None = None) -> tuple[str, str, str, str]:
    selected_video_id = video_id or _find_latest_video_id()
    if not selected_video_id:
        return (
            "No analysis JSON found yet. Upload and analyze a video first, then ask your question.",
            "none",
            "fallback",
            "no_analysis",
        )

    analysis = await load_analysis(selected_video_id)
    if not analysis:
        latest_video_id = _find_latest_video_id()
        if latest_video_id and latest_video_id != selected_video_id:
            latest_analysis = await load_analysis(latest_video_id)
            if latest_analysis:
                selected_video_id = latest_video_id
                analysis = latest_analysis

    if not analysis:
        return (
            "Analysis file was not found for the requested video id.",
            selected_video_id,
            "fallback",
            "analysis_not_found",
        )

    groq_answer, groq_reason = _call_groq_chat(question, analysis, selected_video_id)
    if groq_answer:
        return groq_answer, selected_video_id, "groq", "groq_ok"

    gemini_answer, reason = _call_gemini_chat(question, analysis, selected_video_id)
    if gemini_answer:
        # Keep response source aligned with frontend badge expectations.
        return gemini_answer, selected_video_id, "fallback", "gemini_ok"

    failure_reason = groq_reason or reason or "provider_failed"
    return _fallback_answer(question, analysis, selected_video_id), selected_video_id, "fallback", failure_reason
