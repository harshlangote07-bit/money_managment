from typing import List, Dict, Any
from src.services.shared_projection import SharedProjectionService

class StressEngineService:
    def __init__(self):
        self.projection_service = SharedProjectionService()

    def run_stress_test(
        self, 
        financial_baseline: Dict[str, float], 
        goals: List[Dict[str, Any]], 
        shock_type: str = "job_loss", 
        inflation_spike_pct: float = 0.10
    ) -> Dict[str, Any]:
        """
        Determine how changes to financial assumptions affect the active plan and goal feasibility[cite: 4].
        """
        income = financial_baseline["income"]
        surplus = financial_baseline["net_monthly_surplus"]

        adjusted_surplus = surplus
        if shock_type == "job_loss":
            adjusted_surplus = -(financial_baseline["essential_expenses"] + financial_baseline["debt_repayment"])
        elif shock_type == "inflation_spike":
            adjusted_surplus = income * (1 - inflation_spike_pct)

        # Utilize shared projection service for consistent scenario output[cite: 4]
        projection = self.projection_service.project_timeline(
            financial_baseline=financial_baseline,
            goals=goals,
            inflation_rate=inflation_spike_pct,
            monthly_surplus_override=adjusted_surplus
        )

        return {
            "scenario": shock_type,
            "post_shock_surplus": round(adjusted_surplus, 2),
            "projection_results": projection,
            "plan_survived": adjusted_surplus > 0
        }