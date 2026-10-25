export const PLANNER_LIMITS = Object.freeze({
  MIN_INCOME: 0,
  MAX_MONTHLY_AMOUNT: 1_000_000_000,
  MAX_OUTSTANDING_DEBT: 10_000_000_000,
  MIN_GOAL_AMOUNT: 0.01,
  MAX_GOALS: 50,
  MIN_PROJECTION_MONTHS: 1,
  MAX_PROJECTION_MONTHS: 600,
  MIN_GOAL_HORIZON_MONTHS: 1,
  MAX_GOAL_HORIZON_MONTHS: 600,
  MIN_EMERGENCY_MONTHS: 0,
  MAX_EMERGENCY_MONTHS: 36
});

export const RISK_TOLERANCES = Object.freeze([
  "conservative",
  "moderate",
  "aggressive"
]);

export const INCOME_STABILITIES = Object.freeze([
  "stable",
  "variable",
  "irregular"
]);

export const GOAL_FLEXIBILITIES = Object.freeze([
  "low",
  "medium",
  "high"
]);

export const PLANNER_VERSION = "1.0.0";