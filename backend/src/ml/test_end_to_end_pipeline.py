import pandas as pd
import io
import json
from src.ml.model1_service import TransactionClassifierService
from src.ml.model2_forecaster import ExpenseForecasterService
from src.services.path_engine import PathEngineService

def run_integration_test():
    print("--- Starting End-to-End Pipeline Integration Test ---")

    # 1. Realistic Real-World Transaction Data (Including unseen/weird merchant strings)
    raw_csv_data = """date,description,amount,merchant
2026-01-01,NEFT CR-INFOSYS LTD SALARY,85000,Infosys
2026-01-02,UPI/BESCOM/ELECTRICITY BILL,2400,Bescom
2026-01-03,UPI/BLINKIT/GROCERIES,1500,Blinkit
2026-01-04,UPI/SWIGGY/FOOD DELIVERY,750,Swiggy
2026-01-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
2026-01-06,POS LOCAL_TAPRI_TEA_VENDOR,60,Tapri
2026-01-07,UPI/ZEPTO/INSTANT GROCERIES,890,Zepto
2026-02-01,NEFT CR-INFOSYS LTD SALARY,85000,Infosys
2026-02-02,UPI/BESCOM/ELECTRICITY BILL,2600,Bescom
2026-02-03,UPI/BLINKIT/GROCERIES,1650,Blinkit
2026-02-04,UPI/SWIGGY/FOOD DELIVERY,920,Swiggy
2026-02-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
2026-02-06,POS WEIRD_SHOP_999 PUNE,1400,WeirdShop
2026-03-01,NEFT CR-INFOSYS LTD SALARY,90000,Infosys
2026-03-02,UPI/BESCOM/ELECTRICITY BILL,2200,Bescom
2026-03-03,UPI/BLINKIT/GROCERIES,1400,Blinkit
2026-03-04,UPI/ZOMATO/DINING,1100,Zomato
2026-03-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
2026-04-01,NEFT CR-INFOSYS LTD SALARY,90000,Infosys
2026-04-02,UPI/BESCOM/ELECTRICITY BILL,2500,Bescom
2026-04-03,UPI/BLINKIT/GROCERIES,1550,Blinkit
2026-04-04,UPI/SWIGGY/FOOD DELIVERY,800,Swiggy
2026-04-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
2026-05-01,NEFT CR-INFOSYS LTD SALARY,90000,Infosys
2026-05-02,UPI/BESCOM/ELECTRICITY BILL,2300,Bescom
2026-05-03,UPI/BLINKIT/GROCERIES,1600,Blinkit
2026-05-04,UPI/ZOMATO/DINING,950,Zomato
2026-05-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
2026-06-01,NEFT CR-INFOSYS LTD SALARY,95000,Infosys
2026-06-02,UPI/BESCOM/ELECTRICITY BILL,2450,Bescom
2026-06-03,UPI/BLINKIT/GROCERIES,1700,Blinkit
2026-06-04,UPI/SWIGGY/FOOD DELIVERY,850,Swiggy
2026-06-05,SIP AUTO DEBIT ZERODHA COIN,15000,Zerodha
"""

    df = pd.read_csv(io.BytesIO(raw_csv_data.encode('utf-8')))
    df["date"] = pd.to_datetime(df["date"])

    # 2. Run ML Model 1 (Classification)
    print("\n[1/3] Running ML Model 1 Classification...")
    classifier = TransactionClassifierService()
    categories = []
    uncertainties = []
    for _, row in df.iterrows():
        pred = classifier.predict_transaction(str(row["description"]), str(row["merchant"]))
        categories.append(pred["predicted_category"])
        uncertainties.append(pred["is_uncertain"])
    
    df["final_category"] = categories
    df["is_uncertain"] = uncertainties
    print(f"Successfully classified {len(df)} transactions. Uncertain flags count: {sum(uncertainties)}")

    # 3. Run Engine 1 (Path Engine) with Proper Goal JSON
    print("\n[2/3] Running Engine 1 Path Engine & Financial Baseline...")
    path_engine = PathEngineService()
    financial_baseline = path_engine.calculate_monthly_financials(df)
    
    proper_goals = [
        {"name": "Emergency Reserve", "target_amount": 200000, "current_funded": 50000, "deadline_months": 12, "priority": 1},
        {"name": "Goa Trip", "target_amount": 75000, "current_funded": 10000, "deadline_months": 6, "priority": 2},
        {"name": "MacBook Pro", "target_amount": 150000, "current_funded": 20000, "deadline_months": 18, "priority": 3}
    ]
    
    ranked_paths = path_engine.generate_alternative_paths(financial_baseline, proper_goals)
    print("Financial Baseline Computed:")
    print(json.dumps(financial_baseline, indent=2))

    # 4. Run ML Model 2 (Expense Forecaster)
    print("\n[3/3] Running ML Model 2 Expense Forecasting...")
    forecaster = ExpenseForecasterService()
    expense_forecasts = forecaster.train_and_forecast(df, periods_ahead=3)
    
    print("Future Expense Forecasts (3 Months Ahead):")
    print(json.dumps(expense_forecasts, indent=2))

    print("\n--- Integration Test Completed Successfully ---")

if __name__ == "__main__":
    run_integration_test()
    