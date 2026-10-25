from typing import Dict, Any, List

class PathOptimizerService:
    """
    Engine 1: Path Optimizer Service.
    Generates 3 distinct paths (Aggressive, Balanced, Conservative) based on user goals and profile.
    """

    @staticmethod
    def generate_paths(payload: Dict[str, Any]) -> Dict[str, Any]:
        profile = payload.get("financial_profile", {})
        goals = payload.get("goals", [])
        
        monthly_income = profile.get("monthly_income", 0.0) + profile.get("other_monthly_income", 0.0)
        total_outflows = (
            profile.get("essential_expenses", 0.0) +
            profile.get("discretionary_expenses", 0.0) +
            profile.get("monthly_emi", 0.0) +
            profile.get("monthly_recurring_commitments", 0.0)
        )
        monthly_surplus = monthly_income - total_outflows

        # Generate 3 distinct paths
        paths = [
            {
                "path_id": "aggressive",
                "path_name": "Aggressive Growth Path",
                "feasibility_score": 0.72,
                "allocation_split": {"emergency_fund": 0.20, "goals": 0.80},
                "trade_off_summary": "High monthly contributions to achieve goals faster, but leaves a tighter liquidity buffer.",
                "projected_monthly_surplus": monthly_surplus
            },
            {
                "path_id": "balanced",
                "path_name": "Balanced Allocation Path",
                "feasibility_score": 0.88,
                "allocation_split": {"emergency_fund": 0.40, "goals": 0.60},
                "trade_off_summary": "Moderate growth speed with a safe liquidity and emergency reserve buffer.",
                "projected_monthly_surplus": monthly_surplus
            },
            {
                "path_id": "conservative",
                "path_name": "Conservative Safety Path",
                "feasibility_score": 0.95,
                "allocation_split": {"emergency_fund": 0.70, "goals": 0.30},
                "trade_off_summary": "Maximum liquidity protection and lower risk, resulting in longer goal timelines.",
                "projected_monthly_surplus": monthly_surplus
            }
        ]

        return {
            "status": "success",
            "total_goals_evaluated": len(goals),
            "paths": paths
        }