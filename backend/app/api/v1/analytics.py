from fastapi import APIRouter, HTTPException, Body, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.agents.claude_agent import GenerationAnalytics, AdaptiveLearning

router = APIRouter()

# Singleton instances (in production, use dependency injection or persistent storage)
generation_analytics = GenerationAnalytics()
adaptive_learning = AdaptiveLearning()

class PerformanceLogEntry(BaseModel):
    timestamp: float
    response_time: Optional[float]
    quality: Optional[float]
    cost: Optional[float]

class PerformanceLogResponse(BaseModel):
    performance_log: List[PerformanceLogEntry]
    quality_degradation_events: List[float]

class PromptCacheResponse(BaseModel):
    prompt_cache: Dict[str, str]

class FeedbackRequest(BaseModel):
    generation_id: str = Field(...)
    quality_score: float = Field(..., ge=0, le=10)

class FeedbackResponse(BaseModel):
    average_score: Optional[float]
    all_scores: List[List[Any]]

@router.get("/analytics/performance", response_model=PerformanceLogResponse)
def get_generation_performance(skip: int = Query(0), limit: int = Query(100)):
    """Get Claude generation performance analytics (response time, quality, cost)."""
    log = generation_analytics.performance_log[skip:skip+limit]
    entries = [PerformanceLogEntry(timestamp=e[0], response_time=e[1], quality=e[2], cost=e[3]) for e in log]
    return PerformanceLogResponse(
        performance_log=entries,
        quality_degradation_events=generation_analytics.quality_degradation_events
    )

@router.get("/analytics/prompt-cache", response_model=PromptCacheResponse)
def get_prompt_cache():
    """Get cached prompts for schemas."""
    return PromptCacheResponse(prompt_cache=generation_analytics.prompt_cache)

@router.post("/analytics/feedback", response_model=Dict[str, str])
def submit_feedback(feedback: FeedbackRequest):
    """Submit user feedback for a generation job."""
    try:
        adaptive_learning.learn_from_user_feedback(feedback.generation_id, feedback.quality_score)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feedback error: {str(e)}")

@router.get("/analytics/feedback/{generation_id}", response_model=FeedbackResponse)
def get_feedback(generation_id: str):
    """Get feedback/quality scores for a generation job."""
    try:
        avg = adaptive_learning.get_average_score(generation_id)
        all_scores = adaptive_learning.feedback_store[generation_id]
        return FeedbackResponse(average_score=avg, all_scores=all_scores)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"No feedback found: {str(e)}") 