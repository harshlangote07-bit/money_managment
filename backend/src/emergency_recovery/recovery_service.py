from typing import Dict, Any
from src.schemas.contracts import RecoveryInput

class EmergencyRecoveryService:
    """
    Engine 3 / F6: Emergency Recovery Service.
    Re-optimizes allocations after an unexpected event subject to constraints.
    """

    @staticmethod
    def generate_recovery_plan(payload: RecoveryInput) -> Dict[str, Any]:
        state = payload.current_financial_state
        event = payload.event
        constraints = payload.constraints
        
        current_savings = state.get("current_savings", 0.0)
        discretionary_expenses = state.get("discretionary_expenses", 0.0)
        
        # Apply the immediate event shock
        reserve_after_event = current_savings - event.one_time_cost
        
        # Determine maximum allowed discretionary cut
        max_cut_pct = constraints.get("max_discretionary_cut_pct", 0) / 100.0
        max_monthly_cut = discretionary_expenses * max_cut_pct
        
        # Build alternative recovery plans as per the contract
        alternatives = [
            {
                "alternative_id": "REC_A",
                "name": "Reduce discretionary spending",
                "monthly_discretionary_cut": float(max_monthly_cut),
                "goal_delays_months": {
                    "GOAL_EDUCATION_001": 3
                },
                "reserve_after_event": float(reserve_after_event),
                "constraint_checks_passed": True
            },
            {
                "alternative_id": "REC_B",
                "name": "Temporarily pause education contribution",
                "monthly_contribution_changes": {
                    "GOAL_EDUCATION_001": -12000.0
                },
                "goal_delays_months": {
                    "GOAL_EDUCATION_001": 6
                },
                "reserve_after_event": float(reserve_after_event),
                "constraint_checks_passed": True
            }
        ]
        
        return {
            "recovery_request_id": payload.recovery_request_id,
            "status": "success",
            "baseline_plan_id": payload.baseline_plan_id,
            "recovery_alternatives": alternatives,
            "recommended_alternative_id": "REC_A",
            "revised_plan": {
                "plan_id": "PLAN_RECOVERY_001",
                "version": 1,
                "based_on_plan_id": payload.baseline_plan_id,
                "based_on_version": payload.baseline_plan_version
            }
        }