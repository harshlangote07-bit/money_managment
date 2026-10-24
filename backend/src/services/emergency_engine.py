from typing import List, Dict, Any
from src.services.shared_projection import SharedProjectionService

class EmergencyEngineService:
    def __init__(self):
        self.projection_service = SharedProjectionService()

    def execute_emergency_replan(
        self,
        financial_baseline: Dict[str, float],
        goals: List[Dict[str, Any]],
        emergency_amount: float,
        available_savings_reserve: float = 100000.0
    ) -> Dict[str, Any]:
        """
        Re-plan after an unexpected financial event while minimizing goal disruption[cite: 4].
        """
        remaining_reserve = available_savings_reserve - emergency_amount
        is_breached = remaining_reserve < 0
        shortfall = abs(remaining_reserve) if is_breached else 0.0

        # Generate recovery options (Step 30)[cite: 4]
        recovery_options = [{
            "strategy": "Discretionary Spending Reduction & Timeline Extension",
            "description": "Trim discretionary spending by 50% and extend flexible goal deadlines to absorb emergency shortfall.",
            "feasibility": "High"
        }]

        # Re-run shared projection with depleted reserve context
        projection = self.projection_service.project_timeline(
            financial_baseline=financial_baseline,
            goals=goals,
            monthly_surplus_override=max(0.0, financial_baseline["net_monthly_surplus"] - (shortfall / 12))
        )

        return {
            "emergency_event": {
                "cost": emergency_amount,
                "reserve_after": round(remaining_reserve, 2),
                "is_reserve_depleted": is_breached,
                "shortfall": round(shortfall, 2)
            },
            "recovery_options": recovery_options,
            "revised_projection": projection
        }