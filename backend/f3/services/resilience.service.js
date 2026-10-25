import { getF3Collection } from "../models/collections.js";
import { validateObjectId } from "../utils/validation.js";

const DEFAULT_ML_API_BASE_URL = "http://127.0.0.1:8000";

function getMLBaseUrl() {
  return (process.env.ML_API_BASE_URL || DEFAULT_ML_API_BASE_URL).replace(/\/+$/, "");
}

function buildFinancialBaseline(profile) {
  const income = Number(profile.monthlyIncome || 0);
  const essential = Number(profile.essentialExpenses || 0);
  const discretionary = Number(profile.discretionaryExpenses || 0);
  const debt = Number(profile.monthlyDebtPayments || 0);
  const commitments = Number(profile.monthlyCommitments || 0);

  return {
    income,
    essential_expenses: essential,
    discretionary_expenses: discretionary,
    debt_repayment: debt,
    monthly_commitments: commitments,
    net_monthly_surplus: income - essential - discretionary - debt - commitments,
    savings: Number(profile.savings || 0),
    outstanding_debt: Number(profile.outstandingDebt || 0),
  };
}

function buildEngineGoals(goals) {
  return goals.map((goal) => ({
    goal_id: String(goal._id),
    name: goal.name || "Unnamed goal",
    category: goal.category || "general",
    target_amount: Number(goal.targetAmount || 0),
    current_amount: Number(goal.currentAmount || 0),
    monthly_contribution: Number(goal.monthlyContribution || 0),
    target_date: goal.targetDate || null,
    priority: goal.priority || "medium",
  }));
}

export async function runResilienceAnalysis(profileId, options = {}) {
  const normalizedId = validateObjectId(profileId);
  const collection = await getF3Collection("profiles");
  const profile = await collection.findOne({ _id: normalizedId });

  if (!profile) {
    const error = new Error("Financial profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const goalsCollection = await getF3Collection("goals");
  const goals = await goalsCollection.find({ profileId: normalizedId }).toArray();

  const payload = {
    financial_baseline: buildFinancialBaseline(profile),
    goals: buildEngineGoals(goals),
    income_step_pct: Number(options.incomeStepPct ?? 5),
    expense_step_pct: Number(options.expenseStepPct ?? 5),
    max_shock_pct: Number(options.maxShockPct ?? 100),
  };

  const response = await fetch(
    `${getMLBaseUrl()}/api/engine7/run-resilience-analysis`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(result.detail || "Resilience analysis failed.");
    error.statusCode = response.status;
    throw error;
  }

  const analyses = await getF3Collection("analyses");
  const saved = await analyses.insertOne({
    profileId: normalizedId,
    analysisType: "financial_resilience",
    input: payload,
    result: result.result,
    createdAt: new Date(),
  });

  return {
    success: true,
    analysisId: String(saved.insertedId),
    result: result.result,
  };
}

