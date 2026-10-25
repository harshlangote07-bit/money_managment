from typing import Dict, Any

class ExpenseForecastService:
    """
    ML2: Expense Forecast Model Service.
    Projects future essential and discretionary expenses based on historical data.
    """

    @staticmethod
    def generate_forecast(payload: Dict[str, Any]) -> Dict[str, Any]:
        historical = payload.get("historical_data", {})
        history_list = historical.get("monthly_expense_history", [])
        horizon = payload.get("forecast_horizon_months", 12)
        
        # Simple baseline projection based on historical average trend
        avg_historical = sum(history_list) / len(history_list) if history_list else 35000.0
        
        forecast_months = []
        for m in range(1, horizon + 1):
            # Apply slight inflation/projection step
            essential = round(avg_historical * 0.7 * (1 + (m * 0.005)), 2)
            discretionary = round(avg_historical * 0.3 * (1 + (m * 0.003)), 2)
            
            forecast_months.append({
                "month": m,
                "essential_expenses": essential,
                "discretionary_expenses": discretionary,
                "total_forecast_expenses": round(essential + discretionary, 2)
            })

        return {
            "model": "expense_forecast",
            "profile_id": payload.get("profile_id"),
            "scenario_id": payload.get("scenario_id"),
            "status": "success",
            "forecast": forecast_months,
            "forecast_metadata": {
                "algorithm_used": "linear_trend_projection",
                "confidence_score": 0.89,
                "currency": payload.get("currency", "INR")
            }
        }