import { getF3Collection } from "../models/collections.js";
import { validateObjectId } from "../utils/validation.js";
import {
badRequest,
notFound,
serviceUnavailable
} from "../utils/errors.js";

const DEFAULT_ML_API_BASE_URL = "http://127.0.0.1:8000";

function getMLBaseUrl() {
return (
process.env.ML_API_BASE_URL || DEFAULT_ML_API_BASE_URL
).replace(/\/+$/, "")
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
const monthlyCommitments = Number(
profile.monthlyCommitments || 0
);

return {
income,
essential_expenses: essentialExpenses,
discretionary_expenses: discretionaryExpenses,
debt_repayment: debtRepayment,
monthly_commitments: monthlyCommitments,
net_monthly_surplus:
income -
essentialExpenses -
discretionaryExpenses -
debtRepayment -
monthlyCommitments,
savings: Number(profile.savings || 0),
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
"Stress-testing engine returned an invalid JSON response."
);
}

if (!response.ok) {
const message =
result.detail ||
result.message ||
`Stress-testing engine returned HTTP ${response.status}.`;

```
throw serviceUnavailable(message);
```

}

return result;
}

/**

* Run a financial stress test using the existing Python Engine 2.
*
* Supported shock types must match the Python engine implementation.
* The expected Python route is POST /api/engine2/run-stress-test.
  */
  export async function runStressTest(profileId, scenario = {}) {
  const profileObjectId = validateObjectId(
  profileId,
  "profileId"
  );

if (
!scenario ||
typeof scenario !== "object" ||
Array.isArray(scenario)
) {
throw badRequest("Stress-test scenario must be a JSON object.");
}

const shockType = String(
scenario.shockType || scenario.shock_type || ""
).trim();

if (!shockType) {
throw badRequest(
"shockType is required. Use a shock type supported by Engine 2."
);
}

const inflationSpikePct = Number(
scenario.inflationSpikePct ??
scenario.inflation_spike_pct ??
0
);

if (
!Number.isFinite(inflationSpikePct) ||
inflationSpikePct < 0 ||
inflationSpikePct > 100
) {
throw badRequest(
"inflationSpikePct must be between 0 and 100."
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
shock_type: shockType,
inflation_spike_pct: inflationSpikePct
};

let response;

try {
response = await fetch(
`${getMLBaseUrl()}/api/engine2/run-stress-test`,
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
`Could not connect to Engine 2: ${error.message}`
);
}

const engineResult = await parseEngineResponse(response);

const analysis = {
profileId: profileObjectId,
analysisType: "stress_test",
scenario: {
shockType,
inflationSpikePct
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
