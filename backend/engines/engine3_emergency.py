def run_emergency_recovery(active_plan: dict, emergency_cost: float) -> dict:
    return {
        "shock_cost": emergency_cost,
        "recovery_options": [
            {"strategy": "Reserve Absorption", "disruption_score": "Low"},
            {"strategy": "Pause Flexible SIPs", "disruption_score": "Medium"}
        ]
    }