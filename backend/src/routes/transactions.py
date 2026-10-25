from fastapi import APIRouter, UploadFile, File
import pandas as pd
import io

from src.ml.model1_service import TransactionClassifierService
from src.services.financial_calc import aggregate_for_financial_layer

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])
classifier_service = TransactionClassifierService()

@router.post("/upload")
async def upload_statement(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.BytesIO(contents))
    
    categories = []
    uncertainties = []
    for _, row in df.iterrows():
        desc = str(row.get("description", ""))
        merchant = str(row.get("merchant", ""))
        pred = classifier_service.predict_transaction(desc, merchant)
        categories.append(pred["predicted_category"])
        uncertainties.append(pred["is_uncertain"])
        
    df["final_category"] = categories
    df["is_uncertain"] = uncertainties
    
    summary = aggregate_for_financial_layer(df)
    
    return {
        "filename": file.filename,
        "total_transactions": len(df),
        "summary": summary,
        "preview": df[["date", "description", "amount", "final_category", "is_uncertain"]].to_dict(orient="records")
    }