def run_monthly_projection(profile: dict, goals: list, assumptions: dict) -> dict:
    months = assumptions.get("projection_months", 60)
    monthly_income = profile.get("monthly_income", 80000)
    monthly_surplus = profile.get("available_cash_flow", 35000)
    
    timeline = []
    cash = profile.get("liquid_savings", 100000)
    
    for m in range(1, months + 1):
        cash += monthly_surplus
        timeline.append({"month": m, "cumulative_cash": round(cash, 2)})
        
    return {"projection_timeline": timeline, "status": "success"}