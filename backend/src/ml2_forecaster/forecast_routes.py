from fastapi import APIRouter, HTTPException
from src.schemas.contracts import ForecastInput, ForecastOutput
from src.ml2_forecaster.forecast_service import ExpenseForecastService

router = APIRouter(prefix="/api/ml2", tags=["ML2 - Expense Forecaster"])

@router.post("/forecast", response_model=ForecastOutput)
def generate_expense_forecast(payload: ForecastInput):  # <-- Expects a single object, NOT a List[ForecastInput]
    try:
        result = ExpenseForecastService.generate_forecast(payload.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))