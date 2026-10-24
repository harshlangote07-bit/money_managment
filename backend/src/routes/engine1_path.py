from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import pandas as pd
import io
import json

from src.ml.model1_service import TransactionClassifierService
from src.services.path_engine import PathEngineService

router = APIRouter(prefix="/api/engine1", tags=["Engine 1 - Path Engine"])
classifier = TransactionClassifierService()
path_engine = PathEngineService()

@router.post("/run-path-engine")
async def run_path_engine(
    file: UploadFile = File(..., description="Upload bank statement CSV file"),
    goals_json: str = Form(
        ..., 
        description='Pass JSON array of goals. Example: [{"name": "Emergency Fund", "target_amount": 200000, "current_funded": 50000, "deadline_months": 12, "priority": 1}]'
    )
):
    """
    Pipelines ML Model 1 transaction classification directly into Engine 1 (Path Engine) 
    using uploaded CSV data and user-defined financial goals.
    """
    try:
        # 1. Read uploaded file contents
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', on_bad_lines='skip')
        
        # 2. Parse and validate goals JSON string from form input
        try:
            goals = json.loads(goals_json)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON format in 'goals_json' field.")

        # 3. Pipeline ML Model 1 Classification
        categories = []
        uncertainties = []
        for _, row in df.iterrows():
            desc = str(row.get("description", ""))
            merchant = str(row.get("merchant", "")) if "merchant" in df.columns else ""
            pred = classifier.predict_transaction(desc, merchant)
            categories.append(pred["predicted_category"])
            uncertainties.append(pred["is_uncertain"])
            
        df["final_category"] = categories
        df["is_uncertain"] = uncertainties
        
        # 4. Compute Financial Baseline via Path Engine
        financial_baseline = path_engine.calculate_monthly_financials(df)
        
        # 5. Generate Ranked Alternative Paths
        ranked_paths = path_engine.generate_alternative_paths(financial_baseline, goals)
        
        return {
            "status": "success",
            "total_transactions_processed": len(df),
            "financial_baseline_from_ml1": financial_baseline,
            "ranked_alternative_paths": ranked_paths
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))