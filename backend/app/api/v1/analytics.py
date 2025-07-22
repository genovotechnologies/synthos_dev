from fastapi import APIRouter, HTTPException, Body
from typing import Optional
from app.agents.claude_agent import GenerationAnalytics, AdaptiveLearning

router = APIRouter()

# Singleton instances (in production, use dependency injection or persistent storage)
generation_analytics = GenerationAnalytics()
adaptive_learning = AdaptiveLearning()

@router.get("/analytics/performance")
def get_generation_performance():
    """Get Claude generation performance analytics (response time, quality, cost)."""
    return {
        "performance_log": generation_analytics.performance_log,
        "quality_degradation_events": generation_analytics.quality_degradation_events
    }

@router.get("/analytics/prompt-cache")
def get_prompt_cache():
    """Get cached prompts for schemas."""
    return generation_analytics.prompt_cache

@router.post("/analytics/feedback")
def submit_feedback(generation_id: str = Body(...), quality_score: float = Body(...)):
    """Submit user feedback for a generation job."""
    adaptive_learning.learn_from_user_feedback(generation_id, quality_score)
    return {"status": "success"}

@router.get("/analytics/feedback/{generation_id}")
def get_feedback(generation_id: str):
    """Get feedback/quality scores for a generation job."""
    avg = adaptive_learning.get_average_score(generation_id)
    return {
        "average_score": avg,
        "all_scores": adaptive_learning.feedback_store[generation_id]
    } 