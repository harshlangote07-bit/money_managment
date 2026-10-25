from fastapi import APIRouter, HTTPException
import pandas as pd

from src.ml.model2_forecaster import ExpenseForecasterService

router = APIRouter(prefix="/api/forecast", tags=["Expense Forecasting"])
forecaster = ExpenseForecasterService()

@router.post("/expenses")
async def forecast_future_expenses(transactions: list[dict], periods_ahead: int = 3):
    try:
        df = pd.DataFrame(transactions)
        if "date" not in df.columns or "amount" not in df.columns or "final_category" not in df.columns:
            raise HTTPException(status_code=400, detail="Transactions must contain date, amount, and final_category.")
            
        forecasts = forecaster.train_and_forecast(df, periods_ahead=periods_ahead)
        return {
            "status": "success",
            "periods_ahead": periods_ahead,
            "category_forecasts": forecasts
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    