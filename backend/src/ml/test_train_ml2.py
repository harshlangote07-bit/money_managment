import pandas as pd
from src.ml.model2_forecaster import ExpenseForecasterService

# Sample historical transactions spanning several months
data = [
    {"date": "2026-01-01", "amount": 11500.0, "final_category": "groceries"},
    {"date": "2026-02-01", "amount": 12000.0, "final_category": "groceries"},
    {"date": "2026-03-01", "amount": 12200.0, "final_category": "groceries"},
    {"date": "2026-04-01", "amount": 12500.0, "final_category": "groceries"},
    {"date": "2026-05-01", "amount": 12800.0, "final_category": "groceries"},
    {"date": "2026-06-01", "amount": 13000.0, "final_category": "groceries"},
]

df = pd.DataFrame(data)

# Initialize and run training/forecasting
forecaster = ExpenseForecasterService()
forecasts = forecaster.train_and_forecast(df, periods_ahead=3)

print("Training & Forecasting Results:")
print(forecasts)