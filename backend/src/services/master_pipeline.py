import pandas as pd
import io
from typing import List, Dict, Any

from src.ml.model1_service import TransactionClassifierService
from src.ml.model2_forecaster import ExpenseForecasterService
from src.services.path_engine import PathEngineService
from src.services.stress_engine import StressEngineService
from src.services.emergency_engine import EmergencyEngineService

class MasterPipelineOrchestrator:
    def __init__(self):
        self.classifier = TransactionClassifierService()
        self.forecaster = ExpenseForecasterService()
        self.path_engine = PathEngineService()
        self.stress_engine = StressEngineService()
        self.emergency_engine = EmergencyEngineService()

    def run_complete_ecosystem(
        self, 
        file_contents: bytes, 
        goals: List[Dict[str, Any]], 
        emergency_event: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Master Pipeline:
        Raw CSV -> ML Model 1 (Classification) -> Engine 1 (Pathing) -> ML Model 2 (Forecasting) 
        -> Engine 2 (Stress Testing) -> Engine 3 (Emergency Re-planning).
        """
        # 1. Parse Statement & Run ML Model 1
        df = pd.read_csv(io.BytesIO(file_contents), sep=None, engine='python', on_bad_lines='skip')
        categories, uncertainties = [], []
        for _, row in df.iterrows():
            pred = self.classifier.predict_transaction(str(row.get("description", "")), str(row.get("merchant", "")))
            categories.append(pred["predicted_category"])
            uncertainties.append(pred["is_uncertain"])
        df["final_category"] = categories
        df["is_uncertain"] = uncertainties

        # 2. Run Engine 1 (Path Engine)
        financial_baseline = self.path_engine.calculate_monthly_financials(df)
        ranked_paths = self.path_engine.generate_alternative_paths(financial_baseline, goals)

        # 3. Run ML Model 2 (Expense Forecaster)
        expense_forecasts = self.forecaster.train_and_forecast(df, periods_ahead=3)

        # 4. Run Engine 2 (Stress Test - default job loss check)
        stress_result = self.stress_engine.run_stress_test(financial_baseline, goals, shock_type="job_loss")

        # 5. Run Engine 3 (Emergency Engine if event provided)
        emergency_result = None
        if emergency_event:
            emergency_result = self.emergency_engine.execute_emergency_replan(
                financial_baseline=financial_baseline,
                goals=goals,
                emergency_amount=emergency_event.get("amount", 100000.0),
                emergency_type=emergency_event.get("type", "medical_or_accident")
            )

        return {
            "pipeline_status": "success",
            "transactions_analyzed": len(df),
            "ml1_financial_baseline": financial_baseline,
            "engine1_ranked_paths": ranked_paths,
            "ml2_expense_forecasts": expense_forecasts,
            "engine2_stress_test": stress_result,
            "engine3_emergency_replan": emergency_result
        }