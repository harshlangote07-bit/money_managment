import pandas as pd
import io
import numpy as np
from typing import List, Dict, Any

from src.ml.model1_service import TransactionClassifierService
from src.ml.model2_forecaster import ExpenseForecasterService
from src.services.path_engine import PathEngineService
from src.services.stress_engine import StressEngineService
from src.services.emergency_engine import EmergencyEngineService

class DynamicMasterPipeline:
    def __init__(self):
        self.classifier = TransactionClassifierService()
        self.forecaster = ExpenseForecasterService()
        self.path_engine = PathEngineService()
        self.stress_engine = StressEngineService()
        self.emergency_engine = EmergencyEngineService()

    def run_dynamic_simulation(
        self,
        file_contents: bytes,
        goals: List[Dict[str, Any]],
        simulation_months: int = 12,
        variable_inflation_schedule: List[float] = [0.06, 0.07, 0.08, 0.06, 0.05, 0.09],
        unprecedented_shock_month: int = 4,
        unprecedented_shock_amount: float = 120000.0
    ) -> Dict[str, Any]:
        """
        Executes a rigorous multi-month dynamic simulation across the entire ecosystem:
        1. Resilient CSV ingestion & ML Model 1 classification.
        2. Engine 1 baseline extraction.
        3. ML Model 2 monthly expense forecasting under variable inflation.
        4. Engine 2 & Engine 3 shock injection at specified timeline triggers.
        """
        try:
            # --- EDGE CASE 1: Robust CSV Parsing & Coercion ---
            df = pd.read_csv(io.BytesIO(file_contents), sep=None, engine='python', on_bad_lines='skip')
            required_cols = {"date", "description", "amount"}
            if not required_cols.issubset(df.columns):
                raise ValueError("Dataset missing mandatory columns: 'date', 'description', 'amount'.")

            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
            df = df.dropna(subset=["date", "amount"])

            # --- STEP 1: ML Model 1 Classification ---
            categories, uncertainties = [], []
            for _, row in df.iterrows():
                pred = self.classifier.predict_transaction(str(row.get("description", "")), str(row.get("merchant", "")))
                categories.append(pred["predicted_category"])
                uncertainties.append(pred["is_uncertain"])
            
            df["final_category"] = categories
            df["is_uncertain"] = uncertainties

            # --- STEP 2: Engine 1 Path Engine Baseline ---
            financial_baseline = self.path_engine.calculate_monthly_financials(df)
            ranked_paths = self.path_engine.generate_alternative_paths(financial_baseline, goals)

            # --- STEP 3: ML Model 2 Expense Forecasting ---
            forecasts = self.forecaster.train_and_forecast(df, periods_ahead=simulation_months)

            # --- STEP 4 & 5: Dynamic Monthly Iteration & Shock Injection (Engine 2 & 3) ---
            monthly_ledger = []
            cumulative_savings = financial_baseline.get("existing_investments_sips", 50000.0)
            current_surplus = financial_baseline["net_monthly_surplus"]

            for m in range(1, simulation_months + 1):
                # Fetch variable inflation for the month (cycling through schedule if needed)
                inflation_rate = variable_inflation_schedule[(m - 1) % len(variable_inflation_schedule)]
                
                # Apply inflation to expenses
                monthly_essentials = financial_baseline["essential_expenses"] * (1 + inflation_rate)
                monthly_discretionary = financial_baseline["discretionary_expenses"] * (1 + (inflation_rate / 2))
                adjusted_monthly_surplus = financial_baseline["income"] - (monthly_essentials + monthly_discretionary + financial_baseline["debt_repayment"])

                event_triggered = None
                engine_response = None

                # Trigger Unprecedented Shock / Emergency at target month
                if m == unprecedented_shock_month:
                    event_triggered = {
                        "month": m,
                        "type": "unprecedented_medical_or_liability_shock",
                        "cost": unprecedented_shock_amount
                    }
                    # Run Engine 3 Emergency Re-plan
                    engine_response = self.emergency_engine.execute_emergency_replan(
                        financial_baseline={**financial_baseline, "net_monthly_surplus": adjusted_monthly_surplus},
                        goals=goals,
                        emergency_amount=unprecedented_shock_amount,
                        available_savings_reserve=cumulative_savings
                    )
                    cumulative_savings = engine_response["emergency_event"]["reserve_after"]
                else:
                    cumulative_savings += max(0.0, adjusted_monthly_surplus)

                monthly_ledger.append({
                    "month": m,
                    "applied_inflation_rate": f"{inflation_rate * 100:.1f}%",
                    "monthly_surplus": round(adjusted_monthly_surplus, 2),
                    "cumulative_reserve": round(cumulative_savings, 2),
                    "shock_event": event_triggered,
                    "engine_replan_output": engine_response
                })

            return {
                "simulation_status": "success",
                "total_transactions_parsed": len(df),
                "initial_baseline": financial_baseline,
                "engine1_ranked_strategies": ranked_paths,
                "ml2_forecasts": forecasts,
                "dynamic_monthly_simulation_ledger": monthly_ledger
            }

        except Exception as e:
            raise RuntimeError(f"Dynamic pipeline execution failed: {str(e)}")