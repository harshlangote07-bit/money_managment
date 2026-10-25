from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from src.services.path_engine import PathEngineService

router = APIRouter(prefix="/api/engine1", tags=["Engine 1 - Path Engine"])
path_engine = PathEngineService()

class FinancialProfileModel(BaseModel):
    monthly_income: float
    other_monthly_income: float = 0.0
    essential_expenses: float
    discretionary_expenses: float
    monthly_emi: float = 0.0
    monthly_recurring_commitments: float = 0.0
    current_savings: float = 0.0
    minimum_emergency_reserve: float = 0.0
    outstanding_debt: float = 0.0
    target_emergency_months: int = 6
    minimum_monthly_surplus: float = 0.0
    maximum_goal_horizon_months: int = 120
    projection_months: int = 60
    risk_tolerance: str = "moderate"
    income_stability: str = "stable"

class Engine1JSONRequest(BaseModel):
    financial_profile: FinancialProfileModel
    goals: List[Dict[str, Any]]

@router.post("/run-path-engine-json")
async def run_path_engine_json(payload: Engine1JSONRequest):
    """
    Direct JSON-based endpoint for Engine 1 (Path Engine) using structured financial profile inputs.
    """
    try:
        profile = payload.financial_profile.dict()
        
        # Calculate total income and net monthly surplus based on profile fields
        total_income = profile["monthly_income"] + profile["other_monthly_income"]
        total_outflows = (
            profile["essential_expenses"] + 
            profile["discretionary_expenses"] + 
            profile["monthly_emi"] + 
            profile["monthly_recurring_commitments"]
        )
        net_surplus = total_income - total_outflows

        financial_baseline = {
            "income": float(total_income),
            "essential_expenses": float(profile["essential_expenses"]),
            "discretionary_expenses": float(profile["discretionary_expenses"]),
            "debt_repayment": float(profile["monthly_emi"]),
            "recurring_commitments": float(profile["monthly_recurring_commitments"]),
            "existing_investments_sips": float(profile["current_savings"]),
            "net_monthly_surplus": float(net_surplus)
        }

        # Generate ranked alternative paths
        ranked_paths = path_engine.generate_alternative_paths(financial_baseline, payload.goals)

        return {
            "status": "success",
            "financial_baseline": financial_baseline,
            "ranked_alternative_paths": ranked_paths
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))