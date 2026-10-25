from pydantic import BaseModel
from typing import List, Dict, Any, Optional

# --- ML2: Expense Forecast Model ---
class HistoricalData(BaseModel):
    lookback_months: int
    monthly_expense_history: List[float]

class ForecastInput(BaseModel):
    model: str = "expense_forecast"
    profile_id: str
    baseline_plan_id: str
    scenario_id: str
    historical_data: HistoricalData
    forecast_horizon_months: int
    forecast_targets: List[str]
    currency: str = "INR"

class ForecastMonth(BaseModel):
    month: int
    essential_expenses: float
    discretionary_expenses: float
    total_forecast_expenses: float

class ForecastOutput(BaseModel):
    model: str = "expense_forecast"
    profile_id: str
    scenario_id: str
    status: str
    forecast: List[ForecastMonth]
    forecast_metadata: Dict[str, Any]


# --- Engine 2: Stress Engine ---
class ShockConfig(BaseModel):
    shock_type: str
    income_reduction_pct: float
    essential_expense_increase_pct: float
    discretionary_expense_increase_pct: float
    one_time_emergency_expense: float
    shock_start_month: int
    shock_duration_months: int

class StressInput(BaseModel):
    engine: str = "engine2_stress"
    profile_id: str
    baseline_plan_id: str
    baseline_plan_version: int
    scenario_id: str
    financial_baseline: Dict[str, Any]
    shock: ShockConfig
    projection_horizon_months: int
    constraints: Dict[str, Any]

class StressOutput(BaseModel):
    engine: str = "engine2_stress"
    scenario_id: str
    status: str
    stress_results: Dict[str, Any] 


# --- Engine 3 / F6: Emergency Recovery ---
class EmergencyEvent(BaseModel):
    event_type: str
    event_month: int
    one_time_cost: float
    income_change_pct: float
    income_interruption_months: int

class RecoveryInput(BaseModel):
    profile_id: str
    baseline_plan_id: str
    baseline_plan_version: int
    recovery_request_id: str
    event: EmergencyEvent
    current_financial_state: Dict[str, Any]
    constraints: Dict[str, Any]
    user_priorities: List[str]

class RecoveryAlternative(BaseModel):
    alternative_id: str
    name: str
    monthly_discretionary_cut: Optional[float] = 0.0
    monthly_contribution_changes: Optional[Dict[str, float]] = {}
    goal_delays_months: Dict[str, int]
    reserve_after_event: float
    constraint_checks_passed: bool

class RecoveryOutput(BaseModel):
    recovery_request_id: str
    status: str
    baseline_plan_id: str
    recovery_alternatives: List[RecoveryAlternative]
    recommended_alternative_id: str
    revised_plan: Dict[str, Any]

class ForecastExpenseMonth(BaseModel):
    month: int
    essential_expenses: float
    discretionary_expenses: float

class GoalInput(BaseModel):
    goal_id: str
    target_amount: float
    current_amount: float
    monthly_contribution: float
    target_month: int
    priority: str

class ScenarioChanges(BaseModel):
    income_change_pct: float
    essential_expense_change_pct: float
    discretionary_expense_change_pct: float

class Engine1Input(BaseModel):
    engine: str = "engine1_path"
    profile_id: str
    baseline_plan_id: str
    baseline_plan_version: int
    scenario_id: str
    financial_baseline: Dict[str, Any]
    forecast_expenses: List[ForecastExpenseMonth]
    goals: List[GoalInput]
    scenario_changes: ScenarioChanges
    projection_horizon_months: int
    constraints: Dict[str, Any]