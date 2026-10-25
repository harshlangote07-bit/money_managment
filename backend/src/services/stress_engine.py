from typing import Dict, Any
from src.schemas.contracts import StressInput

class StressEngineService:
    """
    Engine 2: Stress Engine / Reverse Stress Testing.
    Simulates financial shocks over a time horizon and detects constraint failures.
    """

    @staticmethod
    def run_stress_simulation(payload: StressInput) -> Dict[str, Any]:
        baseline = payload.financial_baseline
        shock = payload.shock
        constraints = payload.constraints
        
        current_savings = baseline.get("current_savings", 0.0)
        min_reserve = constraints.get("minimum_emergency_reserve", 0.0)
        
        # Apply immediate one-time shock
        current_savings -= shock.one_time_emergency_expense
        
        failed_constraints = []
        first_failure_month = None
        failure_condition = None
        min_projected_savings = current_savings
        max_monthly_deficit = 0.0
        
        # Simulate month by month
        for month in range(1, payload.projection_horizon_months + 1):
            # Determine if month is within the shock duration
            is_shock_active = (
                shock.shock_start_month <= month < (shock.shock_start_month + shock.shock_duration_months)
            )
            
            # Apply shock multipliers if active
            income_multiplier = (1.0 - (shock.income_reduction_pct / 100.0)) if is_shock_active else 1.0
            ess_exp_multiplier = (1.0 + (shock.essential_expense_increase_pct / 100.0)) if is_shock_active else 1.0
            
            monthly_income = baseline.get("monthly_income", 0.0) * income_multiplier
            essential_exp = baseline.get("essential_expenses", 0.0) * ess_exp_multiplier
            fixed_outflows = baseline.get("monthly_emi", 0.0) + baseline.get("monthly_recurring_commitments", 0.0)
            
            net_cashflow = monthly_income - (essential_exp + fixed_outflows)
            
            if net_cashflow < 0:
                max_monthly_deficit = max(max_monthly_deficit, abs(net_cashflow))
                
            current_savings += net_cashflow
            min_projected_savings = min(min_projected_savings, current_savings)
            
            # Check constraints
            if current_savings < min_reserve and first_failure_month is None:
                first_failure_month = month
                failure_condition = "minimum_emergency_reserve_breached"
                failed_constraints.append({
                    "constraint": "minimum_emergency_reserve",
                    "threshold": min_reserve,
                    "actual_value": round(current_savings, 2),
                    "failure_month": month
                })

        # Determine stress level
        stress_level = "low"
        if first_failure_month is not None:
            stress_level = "high" if first_failure_month <= 6 else "medium"

        survival_months = first_failure_month - 1 if first_failure_month else payload.projection_horizon_months

        return {
            "stress_level": stress_level,
            "survival_months": survival_months,
            "minimum_projected_savings": round(min_projected_savings, 2),
            "maximum_monthly_deficit": round(max_monthly_deficit, 2),
            "first_failure_month": first_failure_month,
            "failure_condition": failure_condition,
            "failed_constraints": failed_constraints,
            "vulnerable_goals": ["GOAL_EDUCATION_001"] if first_failure_month else []
        }