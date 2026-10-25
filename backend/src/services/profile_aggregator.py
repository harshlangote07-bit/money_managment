import pandas as pd
from typing import Dict, Any

def aggregate_transactions_with_user_profile(
    df_classified: pd.DataFrame, 
    user_provided_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Merges ML Model 1 transaction aggregates with explicit user profile inputs 
    to form the complete Engine 1 financial profile JSON.
    """
    if df_classified.empty or "final_category" not in df_classified.columns:
        return user_provided_profile

    cats = df_classified["final_category"].astype(str).str.lower()
    amounts = pd.to_numeric(df_classified["amount"], errors="coerce").fillna(0.0)

    # 1. Extract flow metrics directly from ML Model 1 classification output
    extracted_income = float(amounts[cats.str.contains("income|salary|credit|deposit", na=False)].sum())
    extracted_essentials = float(amounts[cats.str.contains("grocery|groceries|housing|utility|utilities|health|healthcare|insurance", na=False)].sum())
    extracted_discretionary = float(amounts[cats.str.contains("dining|food|transport|fuel|shopping|entertainment|subscription|other/unknown", na=False)].sum())
    extracted_emi = float(amounts[cats.str.contains("loan|debt|emi|repayment", na=False)].sum())
    extracted_commitments = float(amounts[cats.str.contains("saving|invest|sip|own-account", na=False)].sum())

    # 2. Construct the final profile, prioritizing ML extractions where available, 
    # and falling back/taking explicit user inputs for balance sheet & risk metrics.
    return {
        "monthly_income": extracted_income if extracted_income > 0 else user_provided_profile.get("monthly_income", 0.0),
        "other_monthly_income": user_provided_profile.get("other_monthly_income", 0.0),
        "essential_expenses": extracted_essentials if extracted_essentials > 0 else user_provided_profile.get("essential_expenses", 0.0),
        "discretionary_expenses": extracted_discretionary if extracted_discretionary > 0 else user_provided_profile.get("discretionary_expenses", 0.0),
        "monthly_emi": extracted_emi if extracted_emi > 0 else user_provided_profile.get("monthly_emi", 0.0),
        "monthly_recurring_commitments": extracted_commitments if extracted_commitments > 0 else user_provided_profile.get("monthly_recurring_commitments", 0.0),
        # Balance sheet and preference fields strictly taken from user input
        "current_savings": user_provided_profile.get("current_savings", 0.0),
        "minimum_emergency_reserve": user_provided_profile.get("minimum_emergency_reserve", 100000.0),
        "outstanding_debt": user_provided_profile.get("outstanding_debt", 0.0),
        "target_emergency_months": user_provided_profile.get("target_emergency_months", 6),
        "minimum_monthly_surplus": user_provided_profile.get("minimum_monthly_surplus", 10000.0),
        "maximum_goal_horizon_months": user_provided_profile.get("maximum_goal_horizon_months", 120),
        "projection_months": user_provided_profile.get("projection_months", 60),
        "risk_tolerance": user_provided_profile.get("risk_tolerance", "moderate"),
        "income_stability": user_provided_profile.get("income_stability", "stable")
    }