
import { getF3Collection } from "../models/collections.js";
import { validateObjectId, validateNumber } from "../utils/validation.js";
import {
  badRequest,
  notFound,
  serviceUnavailable
} from "../utils/errors.js";

const DEFAULT_ML_API_BASE_URL = "http://127.0.0.1:8000";

function getMLBaseUrl() {
  return (
    process.env.ML_API_BASE_URL || DEFAULT_ML_API_BASE_URL
  ).replace(/\/+$/, "");
}

async function ensureProfileExists(profileId) {
  const profile = await getF3Collection("profiles").findOne({
    _id: profileId
  });

  if (!profile) {
    throw notFound("Financial profile not found.");
  }

  return profile;
}

function buildFinancialBaseline(profile) {
  const income = Number(profile.monthlyIncome || 0);
  const essentialExpenses = Number(profile.essentialExpenses || 0);
  const discretionaryExpenses = Number(
    profile.discretionaryExpenses || 0
  );
  const debtRepayment = Number(profile.monthlyDebtPayments || 0);
  const monthlyCommitments = Number(profile.monthlyCommitments || 0);
  const savings = Number(profile.savings || 0);

  return {
    income,
    essential_expenses: essentialExpenses,
    discretionary_expenses: discretionaryExpenses,
    debt_repayment: debtRepayment,
    existing_investments_sips: monthlyCommitments,
    net_monthly_surplus:
      income -
      essentialExpenses -
      discretionaryExpenses -
      debtRepayment -
      monthlyCommitments,
    opening_cash_reserve: savings,
    savings,
    outstanding_debt: Number(profile.outstandingDebt || 0)
  };
}

function buildEngineGoals(goals) {
  return goals.map((goal) => ({
    goal_id: String(goal._id),
    name: goal.name,
    category: goal.category,
    target_amount: goal.targetAmount,
    current_amount: goal.currentAmount,
    monthly_contribution: goal.monthlyContribution,
    target_date: goal.targetDate
      ? goal.targetDate.toISOString().slice(0, 10)
      : null,
    priority: goal.priority
  }));
}

async function parseEngineResponse(response) {
  const text = await response.text();

  let result;

  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    throw serviceUnavailable(
      "Emergency engine returned an invalid JSON response."
    );
  }

  if (!response.ok) {
    const message =
      result.detail ||
      result.message ||
      `Emergency engine returned HTTP ${response.status}.`;

    throw serviceUnavailable(message);
  }

  return result;
}

/**
 * Execute emergency financial replanning through Python Engine 3.
 *
 * Python endpoint:
 * POST /api/engine3/run-emergency-replan
 */
export async function runEmergencyReplan(profileId, scenario = {}) {
  const profileObjectId = validateObjectId(profileId, "profileId");

  if (
    !scenario ||
    typeof scenario !== "object" ||
    Array.isArray(scenario)
  ) {
    throw badRequest("Emergency scenario must be a JSON object.");
  }

  const emergencyType = String(
    scenario.emergencyType || scenario.emergency_type || ""
  ).trim();

  if (!emergencyType) {
    throw badRequest("emergencyType is required.");
  }

  const emergencyAmount = validateNumber(
    scenario.emergencyAmount ?? scenario.emergency_amount,
    "emergencyAmount",
    { min: 0.01 }
  );

  const availableSavingsReserve = validateNumber(
    scenario.availableSavingsReserve ??
      scenario.available_savings_reserve ??
      0,
    "availableSavingsReserve",
    { min: 0 }
  );

  const incomeInterruptionMonths = validateNumber(
    scenario.incomeInterruptionMonths ??
      scenario.income_interruption_months ??
      0,
    "incomeInterruptionMonths",
    { min: 0, max: 120 }
  );

  if (!Number.isInteger(incomeInterruptionMonths)) {
    throw badRequest(
      "incomeInterruptionMonths must be a whole number."
    );
  }

  const profile = await ensureProfileExists(profileObjectId);

  const goals = await getF3Collection("goals")
    .find({ profileId: profileObjectId })
    .sort({ createdAt: -1 })
    .toArray();

  const financialBaseline = buildFinancialBaseline(profile);
  const engineGoals = buildEngineGoals(goals);

  const requestBody = {
    financial_baseline: financialBaseline,
    goals: engineGoals,
    emergency_amount: emergencyAmount,
    emergency_type: emergencyType,
    available_savings_reserve: availableSavingsReserve,
    income_interruption_months: incomeInterruptionMonths
  };

  let response;

  try {
    response = await fetch(
      `${getMLBaseUrl()}/api/engine3/run-emergency-replan`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(60000)
      }
    );
  } catch (error) {
    throw serviceUnavailable(
      `Could not connect to Engine 3: ${error.message}`
    );
  }

  const engineResult = await parseEngineResponse(response);

  const analysis = {
    profileId: profileObjectId,
    analysisType: "emergency_replan",
    scenario: {
      emergencyType,
      emergencyAmount,
      availableSavingsReserve,
      incomeInterruptionMonths
    },
    inputSummary: {
      financialBaseline,
      goalsCount: engineGoals.length
    },
    result: engineResult,
    createdAt: new Date()
  };

  const insertResult = await getF3Collection("analyses").insertOne(
    analysis
  );

  return {
    ...analysis,
    _id: insertResult.insertedId
  };
}

