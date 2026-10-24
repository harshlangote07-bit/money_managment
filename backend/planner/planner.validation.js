import {
  PLANNER_LIMITS,
  RISK_TOLERANCES,
  INCOME_STABILITIES,
  GOAL_FLEXIBILITIES
} from "./planner.constants.js";

const REQUIRED_NUMBERS = [
  "monthly_income",
  "other_monthly_income",
  "essential_expenses",
  "discretionary_expenses",
  "monthly_emi",
  "monthly_recurring_commitments",
  "current_savings",
  "minimum_emergency_reserve",
  "outstanding_debt",
  "target_emergency_months",
  "minimum_monthly_surplus",
  "maximum_goal_horizon_months",
  "projection_months"
];

function isValidNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function validateAmount(
  field,
  value,
  errors,
  maximum = PLANNER_LIMITS.MAX_MONTHLY_AMOUNT
) {
  if (!isValidNumber(value)) {
    errors.push(`${field} must be a finite number.`);
    return;
  }

  if (value < 0) {
    errors.push(`${field} cannot be negative.`);
  }

  if (value > maximum) {
    errors.push(`${field} exceeds the permitted maximum.`);
  }
}

export function validatePlannerInput(input) {
  const errors = [];
  const warnings = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      valid: false,
      errors: ["Request body must be a JSON object."],
      warnings: []
    };
  }

  for (const field of REQUIRED_NUMBERS) {
    if (!Object.hasOwn(input, field)) {
      errors.push(`Missing required field: ${field}.`);
    }
  }

  const amountFields = [
    "monthly_income",
    "other_monthly_income",
    "essential_expenses",
    "discretionary_expenses",
    "monthly_emi",
    "monthly_recurring_commitments",
    "current_savings",
    "minimum_emergency_reserve",
    "outstanding_debt",
    "minimum_monthly_surplus"
  ];

  for (const field of amountFields) {
    if (Object.hasOwn(input, field)) {
      validateAmount(
        field,
        input[field],
        errors,
        field === "outstanding_debt"
          ? PLANNER_LIMITS.MAX_OUTSTANDING_DEBT
          : PLANNER_LIMITS.MAX_MONTHLY_AMOUNT
      );
    }
  }

  if (isValidNumber(input.target_emergency_months)) {
    if (
      input.target_emergency_months <
        PLANNER_LIMITS.MIN_EMERGENCY_MONTHS ||
      input.target_emergency_months >
        PLANNER_LIMITS.MAX_EMERGENCY_MONTHS
    ) {
      errors.push("target_emergency_months is outside the permitted range.");
    }
  } else if (Object.hasOwn(input, "target_emergency_months")) {
    errors.push("target_emergency_months must be a finite number.");
  }

  if (isValidNumber(input.projection_months)) {
    if (
      !Number.isInteger(input.projection_months) ||
      input.projection_months < PLANNER_LIMITS.MIN_PROJECTION_MONTHS ||
      input.projection_months > PLANNER_LIMITS.MAX_PROJECTION_MONTHS
    ) {
      errors.push("projection_months must be an integer between 1 and 600.");
    }
  }

  if (isValidNumber(input.maximum_goal_horizon_months)) {
    if (
      !Number.isInteger(input.maximum_goal_horizon_months) ||
      input.maximum_goal_horizon_months <
        PLANNER_LIMITS.MIN_GOAL_HORIZON_MONTHS ||
      input.maximum_goal_horizon_months >
        PLANNER_LIMITS.MAX_GOAL_HORIZON_MONTHS
    ) {
      errors.push(
        "maximum_goal_horizon_months must be an integer between 1 and 600."
      );
    }
  }

  if (
    input.risk_tolerance !== undefined &&
    !RISK_TOLERANCES.includes(input.risk_tolerance)
  ) {
    errors.push(
      `risk_tolerance must be one of: ${RISK_TOLERANCES.join(", ")}.`
    );
  }

  if (
    input.income_stability !== undefined &&
    !INCOME_STABILITIES.includes(input.income_stability)
  ) {
    errors.push(
      `income_stability must be one of: ${INCOME_STABILITIES.join(", ")}.`
    );
  }

  if (input.goals !== undefined) {
    if (!Array.isArray(input.goals)) {
      errors.push("goals must be an array.");
    } else {
      if (input.goals.length > PLANNER_LIMITS.MAX_GOALS) {
        errors.push("A maximum of 50 goals is permitted.");
      }

      const goalIds = new Set();

      input.goals.forEach((goal, index) => {
        const prefix = `goals[${index}]`;

        if (!goal || typeof goal !== "object" || Array.isArray(goal)) {
          errors.push(`${prefix} must be an object.`);
          return;
        }

        if (
          typeof goal.goal_id !== "string" ||
          goal.goal_id.trim() === ""
        ) {
          errors.push(`${prefix}.goal_id is required.`);
        } else if (goalIds.has(goal.goal_id)) {
          errors.push(`${prefix}.goal_id must be unique.`);
        } else {
          goalIds.add(goal.goal_id);
        }

        if (
          typeof goal.name !== "string" ||
          goal.name.trim() === ""
        ) {
          errors.push(`${prefix}.name is required.`);
        }

        validateAmount(
          `${prefix}.target_amount`,
          goal.target_amount,
          errors,
          PLANNER_LIMITS.MAX_OUTSTANDING_DEBT
        );

        if (
          isValidNumber(goal.target_amount) &&
          goal.target_amount < PLANNER_LIMITS.MIN_GOAL_AMOUNT
        ) {
          errors.push(`${prefix}.target_amount must be positive.`);
        }

        validateAmount(
          `${prefix}.current_amount`,
          goal.current_amount,
          errors,
          PLANNER_LIMITS.MAX_OUTSTANDING_DEBT
        );

        if (
          isValidNumber(goal.current_amount) &&
          isValidNumber(goal.target_amount) &&
          goal.current_amount > goal.target_amount
        ) {
          errors.push(
            `${prefix}.current_amount cannot exceed target_amount.`
          );
        }

        if (
          typeof goal.target_date !== "string" ||
          !/^\d{4}-\d{2}-\d{2}$/.test(goal.target_date) ||
          !Number.isFinite(Date.parse(`${goal.target_date}T00:00:00Z`)) ||
          new Date(`${goal.target_date}T00:00:00Z`)
            .toISOString()
            .slice(0, 10) !== goal.target_date
        ) {
          errors.push(`${prefix}.target_date must be a valid YYYY-MM-DD date.`);
        }

        if (
          !Number.isInteger(goal.priority) ||
          goal.priority < 1
        ) {
          errors.push(`${prefix}.priority must be a positive integer.`);
        }

        if (
          goal.flexibility !== undefined &&
          !GOAL_FLEXIBILITIES.includes(goal.flexibility)
        ) {
          errors.push(
            `${prefix}.flexibility must be low, medium, or high.`
          );
        }
      });

      const priorities = input.goals
        .map((goal) => goal?.priority)
        .filter(Number.isInteger);

      if (new Set(priorities).size !== priorities.length) {
        errors.push("Goal priorities must be unique.");
      }
    }
  }

  const requiredNumericValuesPresent = REQUIRED_NUMBERS.every(
    (field) =>
      Object.hasOwn(input, field) &&
      isValidNumber(input[field])
  );

  if (requiredNumericValuesPresent) {
    const totalIncome =
      input.monthly_income + input.other_monthly_income;

    const totalExpenses =
      input.essential_expenses +
      input.discretionary_expenses +
      input.monthly_emi +
      input.monthly_recurring_commitments;

    const surplus = totalIncome - totalExpenses;

    if (surplus < 0) {
      warnings.push(
        "Monthly expenses exceed income. Review affordability and existing commitments."
      );
    }

    if (surplus < input.minimum_monthly_surplus) {
      warnings.push(
        "Calculated monthly surplus is below the configured minimum."
      );
    }

    if (input.current_savings < input.minimum_emergency_reserve) {
      warnings.push(
        "Current savings are below the minimum emergency reserve."
      );
    }

    if (
      input.essential_expenses + input.discretionary_expenses > 0 &&
      input.current_savings <
        input.target_emergency_months *
          (input.essential_expenses + input.discretionary_expenses)
    ) {
      warnings.push(
        "Current savings are below the selected emergency-fund coverage target."
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}