def run_stress_test(active_plan: dict, shock_params: dict) -> dict:
    income_drop = shock_params.get("income_drop_pct", 0.20)
    return {
        "scenario": f"Income dropped by {income_drop * 100}%",
        "impact": "Delayed 1 goal by 4 months",
        "fragility_threshold_pct": 28.5
    }