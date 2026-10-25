import pandas as pd
import io
from typing import List, Dict, Any

from src.ml.model1_service import TransactionClassifierService
from src.ml.model2_forecaster import ExpenseForecasterService
from src.services.shared_projection import SharedProjectionService
from src.services.path_engine import PathEngineService
from src.services.stress_engine import StressEngineService
from src.services.emergency_engine import EmergencyEngineService

class MasterUnifiedPipeline:
    def __init__(self):
        self.ml1_classifier = TransactionClassifierService()
        self.ml2_forecaster = ExpenseForecasterService()
        self.shared_projection = SharedProjectionService()
        self.path_engine = PathEngineService()
        self.stress_engine = StressEngineService()
        self.emergency_engine = EmergencyEngineService()

    def execute_complete_ecosystem(
        self,
        file_contents: bytes,
        goals: List[Dict[str, Any]],
        scenario_type: str = None,
        emergency_event: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Executes the exact workflow outlined in the system design doc:
        CSV -> ML Model 1 -> Financial Calculation Layer -> ML Model 2 -> Engines 1/2/3.
        """
        # 1. Ingest CSV & Run ML Model 1 (Transaction Classification)
        df = pd.read_csv(io.BytesIO(file_contents), sep=None, engine='python', on_bad_lines='skip')
        categories, uncertainties = [], []
        for _, row in df.iterrows():
            pred = self.ml1_classifier.predict_transaction(str(row.get("description", "")), str(row.get("merchant", "")))
            categories.append(pred["predicted_category"])
            uncertainties.append(pred["is_uncertain"])
        
        df["final_category"] = categories
        df["is_uncertain"] = uncertainties

        # 2. Financial Calculation Layer (Net Cash Flow & Baseline)
        total_income = df[df["final_category"] == "Income/salary"]["amount"].sum()
        essentials = df[df["final_category"].isin(["groceries", "housing/utilities", "insurance"])]["amount"].sum()
        discretionary = df[df["final_category"].isin(["dining/food delivery", "transport/fuel", "shopping", "entertainment/subscriptions", "other/unknown"])]["amount"].sum()
        debt = df[df["final_category"] == "loan repayment"]["amount"].sum()
        sips = df[df["final_category"] == "savings/investments"]["amount"].sum()
        
        net_surplus = total_income - (essentials + discretionary + debt + sips)

        financial_baseline = {
            "income": float(total_income),
            "essential_expenses": float(essentials),
            "discretionary_expenses": float(discretionary),
            "debt_repayment": float(debt),
            "existing_investments_sips": float(sips),
            "net_monthly_surplus": float(net_surplus)
        }

        # 3. Run ML Model 2 (Expense Forecasting)
        ml2_forecasts = self.ml2_forecaster.train_and_forecast(df)

        # 4. Run Engine 1 (Path Engine) to Generate Ranked Plans
        ranked_paths = self.path_engine.generate_alternative_paths(financial_baseline, goals)

        # 5. Run Engine 2 (Stress Test Engine) if scenario requested
        stress_result = None
        if scenario_type:
            stress_result = self.stress_engine.run_stress_test(financial_baseline, goals, shock_type=scenario_type)

        # 6. Run Engine 3 (Emergency Engine) if emergency event provided
        emergency_result = None
        if emergency_event:
            emergency_result = self.emergency_engine.execute_emergency_replan(
                financial_baseline=financial_baseline,
                goals=goals,
                emergency_amount=emergency_event.get("amount", 100000.0)
            )

        return {
            "status": "success",
            "transactions_processed": len(df),
            "ml1_categorized_summary": {"uncertain_count": int(df["is_uncertain"].sum())},
            "financial_baseline": financial_baseline,
            "ml2_expense_forecasts": ml2_forecasts,
            "engine1_ranked_alternative_paths": ranked_paths,
            "engine2_stress_test_result": stress_result,
            "engine3_emergency_result": emergency_result
        }