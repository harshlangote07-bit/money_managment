import pandas as pd
import io
import numpy as np
from typing import List, Dict, Any, Union

from src.ml.model1_service import TransactionClassifierService
from src.ml.model2_forecaster import ExpenseForecasterService
from src.services.path_engine import PathEngineService

class RobustFinancialPipeline:
    def __init__(self):
        self.classifier = TransactionClassifierService()
        self.forecaster = ExpenseForecasterService()
        self.path_engine = PathEngineService()

    def run_full_pipeline(self, file_contents: bytes, filename: str, goals: List[Dict[str, Any]], periods_ahead: int = 3) -> Dict[str, Any]:
        """
        Executes end-to-end processing with rigorous edge-case handling:
        1. Resilient CSV parsing (auto-delimiter, bad line skipping, date normalization).
        2. ML Model 1 classification with uncertainty flags and fallback routing.
        3. Engine 1 financial baseline & goal allocation with deficit/zero-surplus guardrails.
        4. ML Model 2 dynamic forecasting with small-sample and missing-month fallbacks.
        """
        try:
            # --- EDGE CASE 1: Malformed CSV / Missing Columns ---
            df = pd.read_csv(io.BytesIO(file_contents), sep=None, engine='python', on_bad_lines='skip')
            
            required_cols = {"date", "description", "amount"}
            if not required_cols.issubset(df.columns):
                # Try fallback column name matching (e.g., 'Narration' instead of 'description')
                col_mapping = {c.lower(): c for c in df.columns}
                if 'narration' in col_mapping and 'description' not in df.columns:
                    df = df.rename(columns={col_mapping['narration']: 'description'})
                if 'txn_date' in col_mapping and 'date' not in df.columns:
                    df = df.rename(columns={col_mapping['txn_date']: 'date'})
                if 'value' in col_mapping and 'amount' not in df.columns:
                    df = df.rename(columns={col_mapping['value']: 'amount'})
            
            if not {"date", "description", "amount"}.issubset(df.columns):
                raise ValueError("CSV file missing mandatory columns: 'date', 'description', or 'amount'.")

            # --- EDGE CASE 2: Date & Amount Sanitization ---
            df["date"] = pd.to_datetime(df["date"], errors="coerce")
            df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)
            df = df.dropna(subset=["date", "amount"])

            # --- STEP 1: ML Model 1 Classification ---
            categories = []
            uncertainties = []
            for _, row in df.iterrows():
                desc = str(row.get("description", ""))
                merchant = str(row.get("merchant", "")) if "merchant" in df.columns else ""
                pred = self.classifier.predict_transaction(desc, merchant)
                categories.append(pred["predicted_category"])
                uncertainties.append(pred["is_uncertain"])
                
            df["final_category"] = categories
            df["is_uncertain"] = uncertainties

            # --- STEP 2: Engine 1 Financial Baseline & Goals ---
            financial_baseline = self.path_engine.calculate_monthly_financials(df)
            
            # Sanitize goal inputs to prevent division by zero or negative deadlines
            sanitized_goals = []
            for g in goals:
                deadline = max(1, int(g.get("deadline_months", 12)))
                target = max(0.0, float(g.get("target_amount", 0.0)))
                funded = max(0.0, float(g.get("current_funded", 0.0)))
                sanitized_goals.append({
                    "name": g.get("name", "Unnamed Goal"),
                    "target_amount": target,
                    "current_funded": funded,
                    "deadline_months": deadline,
                    "priority": int(g.get("priority", 1))
                })

            ranked_paths = self.path_engine.generate_alternative_paths(financial_baseline, sanitized_goals)

            # --- STEP 3: ML Model 2 Expense Forecasting ---
            forecasts = self.forecaster.train_and_forecast(df, periods_ahead=periods_ahead)

            return {
                "status": "success",
                "filename": filename,
                "total_transactions_processed": len(df),
                "financial_baseline": financial_baseline,
                "ranked_alternative_paths": ranked_paths,
                "future_expense_forecasts": forecasts,
                "uncategorized_or_uncertain_count": int(df["is_uncertain"].sum())
            }

        except Exception as e:
            raise RuntimeError(f"Pipeline execution failed: {str(e)}")