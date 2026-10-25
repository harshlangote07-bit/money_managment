import pandas as pd
from typing import Dict, Any

def aggregate_transactions_with_user_profile(
    df_classified: pd.DataFrame, 
    user_provided_profile: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Maps classified ML Model 1 transaction columns (final_category and amount) 
    directly into the exact Engine 1 JSON input schema.
    """
    if df_classified.empty or "final_category" not in df_classified.columns:
        return user_provided_profile

    # Clean and parse amounts
    amounts = pd.to_numeric(df_classified["amount"], errors="coerce").fillna(0.0)
    cats = df_classified["final_category"].astype(str).str.lower()

    # 1. Map ML categories to Engine 1 flow fields
    income_sum = float(amounts[cats.str.contains("income|salary", na=False)].sum())
    
    # Essentials include housing, utilities, groceries, healthcare, insurance
    essential_sum = float(amounts[cats.str.contains("housing|utility|utilities|grocery|groceries|health|healthcare|insurance", na=False)].sum())
    
    # Discretionary includes dining, shopping, entertainment, transport, and leftover unclassified/unknown items
    discretionary_mask = cats.str.contains("dining|food|shopping|entertainment|transport|fuel|subscription|other/unknown", na=False)
    discretionary_sum = float(amounts[discretionary_mask].sum())
    
    # Debt repayments / EMIs
    emi_sum = float(amounts[cats.str.contains("loan|debt|emi|repayment", na=False)].sum())
    
    # Recurring commitments / SIPs / Investments
    commitments_sum = float(amounts[cats.str.contains("saving|invest|sip|mutual", na=False)].sum())

    # 2. Merge extracted flows with user profile balance sheet inputs
    return {
        "monthly_income": income_sum if income_sum > 0 else user_provided_profile.get("monthly_income", 85000.0),
        "other_monthly_income": user_provided_profile.get("other_monthly_income", 5000.0),
        "essential_expenses": essential_sum if essential_sum > 0 else user_provided_profile.get("essential_expenses", 25000.0),
        "discretionary_expenses": discretionary_sum if discretionary_sum > 0 else user_provided_profile.get("discretionary_expenses", 10000.0),
        "monthly_emi": emi_sum if emi_sum > 0 else user_provided_profile.get("monthly_emi", 8000.0),
        "monthly_recurring_commitments": commitments_sum if commitments_sum > 0 else user_provided_profile.get("monthly_recurring_commitments", 2000.0),
        # Balance sheet & risk preference fields from user configuration
        "current_savings": user_provided_profile.get("current_savings", 250000.0),
        "minimum_emergency_reserve": user_provided_profile.get("minimum_emergency_reserve", 100000.0),
        "outstanding_debt": user_provided_profile.get("outstanding_debt", 300000.0),
        "target_emergency_months": user_provided_profile.get("target_emergency_months", 6),
        "minimum_monthly_surplus": user_provided_profile.get("minimum_monthly_surplus", 10000.0),
        "maximum_goal_horizon_months": user_provided_profile.get("maximum_goal_horizon_months", 120),
        "projection_months": user_provided_profile.get("projection_months", 60),
        "risk_tolerance": user_provided_profile.get("risk_tolerance", "moderate"),
        "income_stability": user_provided_profile.get("income_stability", "stable")
    }