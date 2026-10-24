from typing import List, Dict, Any
from src.services.shared_projection import SharedProjectionService

class PathEngineService:
    def __init__(self):
        self.projection_service = SharedProjectionService()

    def generate_alternative_paths(
        self, 
        financial_baseline: Dict[str, float], 
        goals: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Generate, compare, and rank alternative plans for achieving multiple goals simultaneously[cite: 4].
        """
        surplus = financial_baseline["net_monthly_surplus"]
        strategies = ["Balanced Allocation", "High-Priority Goal First", "Buffer-First Allocation"]
        ranked_plans = []

        effective_surplus = max(0.0, surplus)

        for idx, strategy in enumerate(strategies):
            plan_goals = []
            remaining_surplus = effective_surplus
            sorted_goals = sorted(goals, key=lambda g: g.get("priority", 1) if idx == 1 else g.get("deadline_months", 12))
            
            feasible = surplus > 0
            total_shortfall = 0.0

            for goal in sorted_goals:
                target = goal["target_amount"] - goal.get("current_funded", 0)
                deadline = goal.get("deadline_months", 12)
                required_monthly = target / max(1, deadline)

                if effective_surplus == 0:
                    allocated = 0.0
                elif idx == 0:
                    allocated = min(remaining_surplus / len(sorted_goals), required_monthly)
                elif idx == 1:
                    allocated = min(remaining_surplus, required_monthly) if remaining_surplus > 0 else 0.0
                else:
                    allocated = min(remaining_surplus * 0.6, required_monthly)

                remaining_surplus -= allocated
                shortfall = max(0.0, target - (allocated * deadline))

                if shortfall > 0 or surplus <= 0:
                    feasible = False
                    total_shortfall += shortfall if shortfall > 0 else target

                plan_goals.append({
                    "goal_name": goal["name"],
                    "monthly_contribution": round(allocated, 2),
                    "shortfall": round(shortfall, 2)
                })

            ranked_plans.append({
                "strategy_name": strategy,
                "is_feasible": feasible,
                "total_monthly_allocated": round(effective_surplus - remaining_surplus, 2),
                "total_shortfall": round(total_shortfall, 2),
                "goal_breakdown": plan_goals,
                "trade_off_explanation": f"Evaluated via Path Engine under surplus ₹{surplus:.2f}."
            })

        return ranked_plans