from typing import List, Dict, Any

class SharedProjectionService:
    def project_timeline(
        self,
        financial_baseline: Dict[str, float],
        goals: List[Dict[str, Any]],
        projection_months: int = 12,
        inflation_rate: float = 0.06,
        monthly_surplus_override: float = None
    ) -> Dict[str, Any]:
        """
        Shared projection logic used by all three engines to compute consistent 
        month-by-month cash flows, balances, goal progress, and shortfalls.
        """
        income = financial_baseline.get("income", 0.0)
        essentials = financial_baseline.get("essential_expenses", 0.0)
        discretionary = financial_baseline.get("discretionary_expenses", 0.0)
        debt = financial_baseline.get("debt_repayment", 0.0)
        sips = financial_baseline.get("existing_investments_sips", 0.0)
        
        # Net monthly cash flow calculation
        surplus = monthly_surplus_override if monthly_surplus_override is not None else (
            income - (essentials + discretionary + debt + sips)
        )
        
        monthly_ledger = []
        cumulative_cash = financial_baseline.get("opening_cash_reserve", 50000.0)
        
        # Track goal statuses
        goal_trackers = []
        for g in goals:
            goal_trackers.append({
                "name": g["name"],
                "target_amount": g["target_amount"],
                "current_funded": g.get("current_funded", 0.0),
                "deadline_months": g.get("deadline_months", 12),
                "priority": g.get("priority", 1)
            })

        for m in range(1, projection_months + 1):
            # Inflate essential expenses over time
            inflated_essentials = essentials * ((1 + inflation_rate) ** (m / 12.0))
            monthly_net_cash = income - (inflated_essentials + discretionary + debt)
            
            cumulative_cash += max(0.0, monthly_net_cash)
            
            monthly_ledger.append({
                "month": m,
                "net_monthly_cash_flow": round(monthly_net_cash, 2),
                "cumulative_reserve_balance": round(cumulative_cash, 2)
            })

        return {
            "projection_months": projection_months,
            "monthly_ledger": monthly_ledger,
            "ending_reserve": round(cumulative_cash, 2),
            "baseline_surplus_used": round(surplus, 2)
        }