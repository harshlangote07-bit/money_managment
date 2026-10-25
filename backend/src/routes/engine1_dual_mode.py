from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional
import json
import pandas as pd
import io

from src.ml.model1_service import TransactionClassifierService
from src.services.path_engine import PathEngineService
from src.services.profile_aggregator import aggregate_transactions_with_user_profile  # <-- Updated import name

router = APIRouter(prefix="/api/engine1", tags=["Engine 1 - Dual Mode Workflow"])
classifier = TransactionClassifierService()
path_engine = PathEngineService()

@router.post("/run-engine1-flexible")
async def run_engine1_flexible(
    mode: str = Form(..., description="Switch mode: 'manual' (for dropdown-tuned JSON) or 'ml_automated' (for CSV -> ML1 aggregation)"),
    goals_json: str = Form(..., description="JSON array of goals"),
    profile_json: Optional[str] = Form(None, description="Required for 'manual' mode: JSON financial profile"),
    file: Optional[UploadFile] = File(None, description="Required for 'ml_automated' mode: Bank statement CSV")
):
    try:
        goals = json.loads(goals_json)

        if mode == "manual":
            if not profile_json:
                raise HTTPException(status_code=400, detail="profile_json is required when mode='manual'.")
            profile = json.loads(profile_json)
            execution_branch = "Manual Input (Dropdown-Tuned JSON)"

        elif mode == "ml_automated":
            if not file:
                raise HTTPException(status_code=400, detail="CSV file upload is required when mode='ml_automated'.")
            
            contents = await file.read()
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', on_bad_lines='skip')
            
            categories, uncertainties = [], []
            for _, row in df.iterrows():
                pred = classifier.predict_transaction(str(row.get("description", "")), str(row.get("merchant", "")))
                categories.append(pred["predicted_category"])
                uncertainties.append(pred["is_uncertain"])
            
            df["final_category"] = categories
            df["is_uncertain"] = uncertainties

            # Provide default/fallback user profile items for balance sheet parameters
            default_user_profile = {
                "current_savings": 250000.0,
                "minimum_emergency_reserve": 100000.0,
                "outstanding_debt": 300000.0,
                "target_emergency_months": 6,
                "minimum_monthly_surplus": 10000.0,
                "maximum_goal_horizon_months": 120,
                "projection_months": 60,
                "risk_tolerance": "moderate",
                "income_stability": "stable"
            }

            profile = aggregate_transactions_with_user_profile(df, default_user_profile)
            execution_branch = "ML Model 1 Automated Aggregation + User Profile Merging"

        else:
            raise HTTPException(status_code=400, detail="Invalid mode. Must be 'manual' or 'ml_automated'.")

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
            "existing_investments_sips": float(profile["current_savings"]),
            "net_monthly_surplus": float(net_surplus)
        }

        ranked_paths = path_engine.generate_alternative_paths(financial_baseline, goals)

        return {
            "status": "success",
            "branch_executed": execution_branch,
            "engine1_formatted_profile_json": profile,
            "financial_baseline": financial_baseline,
            "ranked_alternative_paths": ranked_paths
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))