from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from src.services.emergency_engine import EmergencyEngineService

router = APIRouter(prefix="/api/engine3", tags=["Engine 3 - Emergency Engine"])
emergency_engine = EmergencyEngineService()

class EmergencyRequest(BaseModel):
    financial_baseline: Dict[str, float]
    goals: List[Dict[str, Any]]
    emergency_amount: float
    emergency_type: str = "medical_or_accident"
    available_savings_reserve: float = 100000.0
    income_interruption_months: int = 0

@router.post("/run-emergency-replan")
async def run_emergency_replan(payload: EmergencyRequest):
    """
    Executes Engine 3 emergency re-planning: inserts unexpected financial events, 
    calculates reserve depletion, generates recovery options, 
    and adjusts goal timelines.
    """
    try:
        result = emergency_engine.execute_emergency_replan(
            financial_baseline=payload.financial_baseline,
            goals=payload.goals,
            emergency_amount=payload.emergency_amount,
            emergency_type=payload.emergency_type,
            available_savings_reserve=payload.available_savings_reserve,
            income_interruption_months=payload.income_interruption_months
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))