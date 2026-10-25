from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import pandas as pd
import io
import json

from src.ml.model1_service import TransactionClassifierService
from src.services.path_engine import PathEngineService

router = APIRouter(prefix="/api/workflow", tags=["Interactive Workflow - ML1 to Engine 1"])
classifier = TransactionClassifierService()
path_engine = PathEngineService()

# The 14 official taxonomy tags for frontend dropdown menus
TAXONOMY_TAGS = [
    "Income/salary", "groceries", "dining/food delivery", "transport/fuel",
    "housing/utilities", "healthcare", "education", "shopping",
    "entertainment/subscriptions", "loan repayment", "insurance",
    "own-account transfers", "savings/investments", "other/unknown"
]

@router.get("/taxonomy-tags")
async def get_taxonomy_tags():
    """
    Returns the 14 taxonomy tags to populate the frontend dropdown menu for user reviews.
    """
    return {"taxonomy_tags": TAXONOMY_TAGS}


@router.post("/step1-classify-and-flag")
async def step1_classify_and_flag(file: UploadFile = File(...)):
    """
    Step 1: ML Model 1 processes the bank statement CSV, flagging low-confidence 
    or 'other/unknown' items while preserving original transaction metadata.
    """
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', on_bad_lines='skip')
        
        if not {"date", "description", "amount"}.issubset(df.columns):
            raise HTTPException(status_code=400, detail="CSV missing mandatory columns: date, description, amount.")

        processed_rows = []
        flagged_for_review = []

        for idx, row in df.iterrows():
            desc = str(row.get("description", ""))
            merchant = str(row.get("merchant", "")) if "merchant" in df.columns else ""
            pred = classifier.predict_transaction(desc, merchant)
            
            category = pred["predicted_category"]
            is_uncertain = pred["is_uncertain"] or (category == "other/unknown")

            row_data = {
                "row_id": int(idx),
                "date": str(row["date"]),
                "description": desc,
                "amount": float(row["amount"]),
                "merchant": merchant,
                "assigned_category": category,
                "is_uncertain": is_uncertain
            }
            
            processed_rows.append(row_data)
            if is_uncertain:
                flagged_for_review.append(row_data)

        return {
            "status": "requires_user_review" if flagged_for_review else "ready_for_engine1",
            "flagged_count": len(flagged_for_review),
            "flagged_transactions": flagged_for_review,
            "all_transactions": processed_rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/step2-update-and-run-engine1")
async def step2_update_and_run_engine1(
    transactions_json: str = Form(..., description="Updated JSON array of transactions with user dropdown corrections"),
    goals_json: str = Form(..., description="JSON string of user financial goals")
):
    """
    Step 2: Receives the JSON where uncertain items have been updated via the dropdown, 
    re-maps the categories, and sends them directly into Engine 1 for path generation.
    """
    try:
        transactions = json.loads(transactions_json)
        goals = json.loads(goals_json)
        
        df = pd.DataFrame(transactions)
        
        # Ensure category mapping matches dropdown choices
        if "final_category" not in df.columns and "assigned_category" in df.columns:
            df["final_category"] = df["assigned_category"]

        # Validate that selected categories exist in the official taxonomy
        invalid_tags = df[~df["final_category"].isin(TAXONOMY_TAGS)]
        if not invalid_tags.empty:
            raise HTTPException(status_code=400, detail=f"Invalid taxonomy tag detected. Must be one of the 14 allowed tags.")

        # Compute Financial Baseline & Engine 1 Paths
        financial_baseline = path_engine.calculate_monthly_financials(df)
        ranked_paths = path_engine.generate_alternative_paths(financial_baseline, goals)

        return {
            "status": "success",
            "message": "Dropdown selections updated successfully. Pipelined into Engine 1.",
            "financial_baseline": financial_baseline,
            "ranked_alternative_paths": ranked_paths
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON format in payload.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))