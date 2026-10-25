from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from src.services.stress_engine import StressEngineService

router = APIRouter(prefix="/api/engine2", tags=["Engine 2 - Stress Test Engine"])
stress_engine = StressEngineService()

class StressTestRequest(BaseModel):
    financial_baseline: Dict[str, float]
    goals: List[Dict[str, Any]]
    shock_type: str = "job_loss" # options: 'job_loss', 'medical_emergency', 'inflation_spike'
    shock_severity_months: int = 6
    inflation_spike_pct: float = 0.10

@router.post("/run-stress-test")
async def run_stress_test(payload: StressTestRequest):
    try:
        result = stress_engine.run_stress_test(
            financial_baseline=payload.financial_baseline,
            goals=payload.goals,
            shock_type=payload.shock_type,
            shock_severity_months=payload.shock_severity_months,
            inflation_spike_pct=payload.inflation_spike_pct
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))