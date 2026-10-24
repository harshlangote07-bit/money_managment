import re
import pandas as pd

ESSENTIAL = {"groceries", "housing/utilities", "healthcare", "education", "insurance", "transport/fuel"}
DISCRETIONARY = {"dining/food delivery", "shopping", "entertainment/subscriptions", "other/unknown"}
CC_PATTERN = re.compile(r"\b(credit card|cc bill|card payment|amex|cred)\b", re.IGNORECASE)

def aggregate_for_financial_layer(df: pd.DataFrame) -> dict:
    df = df.copy()
    df["year_month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)
    
    df["excluded"] = (df["final_category"] == "own-account transfers") | \
                     (df["final_category"] == "loan repayment") & df["description"].str.contains(CC_PATTERN)
    
    active = df[~df["excluded"]]
    summary = {}
    for ym, g in active.groupby("year_month"):
        inc = g[g["final_category"] == "Income/salary"]["amount"].sum()
        ess = g[g["final_category"].isin(ESSENTIAL)]["amount"].sum()
        disc = g[g["final_category"].isin(DISCRETIONARY)]["amount"].sum()
        emi = g[g["final_category"] == "loan repayment"]["amount"].sum()
        summary[ym] = {
            "income": float(inc), "essential_expenses": float(ess),
            "discretionary_expenses": float(disc), "mandatory_debt_repayment": float(emi),
            "available_cash_flow": float(inc - ess - disc - emi)
        }
    return {"monthly_financial_summary": summary, "excluded_count": int(df["excluded"].sum())}
