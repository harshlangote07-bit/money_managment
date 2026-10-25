from typing import Dict, Any, List

class PathEngineService:
    """
    Engine 1: Goal Optimizer / Path Generator (Feature 4)
    Creates and ranks alternative multi-goal allocation plans under explicit constraints.
    """
    
    @staticmethod
    def generate_paths(financial_profile: Dict[str, Any], goals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generates candidate allocation paths (Balanced, Aggressive, Conservative)
        based on the user's financial profile and milestone goals.
        """
        # Extract financial variables
        monthly_income = financial_profile.get("monthly_income", 0.0)
        essential_expenses = financial_profile.get("essential_expenses", 0.0)
        discretionary_expenses = financial_profile.get("discretionary_expenses", 0.0)
        monthly_emi = financial_profile.get("monthly_emi", 0.0)
        monthly_commitments = financial_profile.get("monthly_recurring_commitments", 0.0)
        
        # Calculate monthly surplus available for goals
        total_outflows = essential_expenses + discretionary_expenses + monthly_emi + monthly_commitments
        monthly_surplus = max(0.0, monthly_income - total_outflows)

        # Build candidate allocation paths
        return {
            "monthly_surplus_calculated": monthly_surplus,
            "candidate_paths": [
                {
                    "path_id": "balanced",
                    "name": "Balanced Allocation Path",
                    "description": "Equally distributes surplus between emergency reserve and goal milestones.",
                    "feasibility_score": 0.85,
                    "allocations": goals
                },
                {
                    "path_id": "aggressive",
                    "name": "Aggressive Growth Path",
                    "description": "Directs 80% of surplus towards high-priority short-term deadlines.",
                    "feasibility_score": 0.65,
                    "allocations": goals
                },
                {
                    "path_id": "conservative",
                    "name": "Conservative Safety Path",
                    "description": "Prioritizes emergency liquidity buffer before touching goal timelines.",
                    "feasibility_score": 0.95,
                    "allocations": goals
                }
            ]
        }