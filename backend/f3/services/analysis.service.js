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

function getMonthlyFinancialBaseline(profile) {
const monthlyIncome = Number(profile.monthlyIncome || 0);
const essentialExpenses = Number(profile.essentialExpenses || 0);
const discretionaryExpenses = Number(
profile.discretionaryExpenses || 0
);
const debtRepayment = Number(profile.monthlyDebtPayments || 0);
const monthlyCommitments = Number(
profile.monthlyCommitments || 0
);

const netMonthlySurplus =
monthlyIncome -
essentialExpenses -
discretionaryExpenses -
debtRepayment -
monthlyCommitments;

return {
monthly_income: monthlyIncome,
essential_expenses: essentialExpenses,
discretionary_expenses: discretionaryExpenses,
debt_repayment: debtRepayment,
monthly_commitments: monthlyCommitments,
net_monthly_surplus: netMonthlySurplus
};
}

function toEngineGoal(goal) {
return {
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
};
}

function toTransactionCSV(transactions) {
const escapeCSV = (value) => {
const text = String(value ?? "");
return `"${text.replace(/"/g, '""')}"`;
};

const headers = [
"date",
"description",
"amount",
"type",
"category"
];

const rows = transactions.map((transaction) => [
transaction.date instanceof Date
? transaction.date.toISOString().slice(0, 10)
: String(transaction.date).slice(0, 10),
transaction.description,
transaction.amount,
transaction.type,
transaction.final_category || transaction.category
]);

return [
headers.map(escapeCSV).join(","),
...rows.map((row) => row.map(escapeCSV).join(","))
].join("\n");
}

async function readJSONResponse(response, serviceName) {
const responseText = await response.text();

let result;

try {
result = responseText ? JSON.parse(responseText) : {};
} catch {
throw serviceUnavailable(
`${serviceName} returned an invalid JSON response.`
);
}

if (!response.ok) {
const message =
result.detail ||
result.message ||
`${serviceName} returned HTTP ${response.status}.`;

```
throw serviceUnavailable(message);
```

}

return result;
}

async function callForecastEngine(transactions, periodsAhead) {
const expenses = transactions
.filter((transaction) => transaction.type === "expense")
.map((transaction) => ({
date: transaction.date instanceof Date
? transaction.date.toISOString().slice(0, 10)
: String(transaction.date).slice(0, 10),
amount: transaction.amount,
category: transaction.final_category || transaction.category
}));

if (expenses.length === 0) {
return {
status: "skipped",
reason: "No expense transactions are available for forecasting."
};
}

const url = new URL(
`${getMLBaseUrl()}/api/forecast/expenses`
);

url.searchParams.set(
"periods_ahead",
String(periodsAhead)
);

let response;

try {
response = await fetch(url, {
method: "POST",
headers: {
"Content-Type": "application/json"
},
body: JSON.stringify(expenses),
signal: AbortSignal.timeout(30000)
});
} catch (error) {
throw serviceUnavailable(
`Could not connect to the forecasting API: ${error.message}`
);
}

return readJSONResponse(response, "Forecasting API");
}

/**

* Run financial analysis using the existing Python Engine 1 and
* expense forecasting endpoint.
*
* The Python Engine 1 route expects:
* * CSV file upload
* * goals_json form field
    */
    export async function runFinancialAnalysis(
    profileId,
    options = {}
    ) {
    const profileObjectId = validateObjectId(
    profileId,
    "profileId"
    );

const periodsAhead = Number(options.periodsAhead ?? 3);

if (
!Number.isInteger(periodsAhead) ||
periodsAhead < 1 ||
periodsAhead > 24
) {
throw badRequest(
"periodsAhead must be an integer between 1 and 24."
);
}

const profile = await ensureProfileExists(profileObjectId);

const [goals, transactions] = await Promise.all([
getF3Collection("goals")
.find({ profileId: profileObjectId })
.sort({ createdAt: -1 })
.toArray(),

```
getF3Collection("transactions")
  .find({ profileId: profileObjectId })
  .sort({ date: 1 })
  .toArray()
```

]);

if (goals.length === 0) {
throw badRequest(
"Add at least one financial goal before running analysis."
);
}

if (transactions.length === 0) {
throw badRequest(
"Add transaction history before running analysis."
);
}

const financialBaseline = getMonthlyFinancialBaseline(profile);
const engineGoals = goals.map(toEngineGoal);
const csv = toTransactionCSV(transactions);

// Engine 1 accepts a CSV upload and a goals_json form field.
const formData = new FormData();

formData.append(
"file",
new Blob([csv], { type: "text/csv" }),
"transactions.csv"
);

formData.append(
"goals_json",
JSON.stringify(engineGoals)
);

let engine1Response;

try {
engine1Response = await fetch(
`${getMLBaseUrl()}/api/engine1/run-path-engine`,
{
method: "POST",
body: formData,
signal: AbortSignal.timeout(60000)
}
);
} catch (error) {
throw serviceUnavailable(
`Could not connect to Engine 1: ${error.message}`
);
}

const engine1Result = await readJSONResponse(
engine1Response,
"Engine 1"
);

// Run the existing forecasting API as part of the analysis.
const forecast = await callForecastEngine(
transactions,
periodsAhead
);

const analysis = {
profileId: profileObjectId,
analysisType: "financial_analysis",
createdAt: new Date(),
inputSummary: {
goalsCount: goals.length,
transactionsCount: transactions.length,
periodsAhead,
financialBaseline
},
engine1: engine1Result,
forecast
};

const result = await getF3Collection("analyses").insertOne(
analysis
);

return {
...analysis,
_id: result.insertedId
};
}

/**

* Return the most recent saved analysis for a profile.
  */
  export async function getLatestAnalysis(profileId) {
  const profileObjectId = validateObjectId(
  profileId,
  "profileId"
  );

await ensureProfileExists(profileObjectId);

const analysis = await getF3Collection("analyses")
.find({ profileId: profileObjectId })
.sort({ createdAt: -1 })
.limit(1)
.next();

if (!analysis) {
throw notFound("No financial analysis has been run yet.");
}

return analysis;
}

/**

* Return recent saved analyses for a profile.
  */
  export async function listAnalyses(profileId, limit = 10) {
  const profileObjectId = validateObjectId(
  profileId,
  "profileId"
  );

await ensureProfileExists(profileObjectId);

const parsedLimit = Number(limit);

if (
!Number.isInteger(parsedLimit) ||
parsedLimit < 1 ||
parsedLimit > 50
) {
throw badRequest("limit must be an integer between 1 and 50.");
}

return getF3Collection("analyses")
.find({ profileId: profileObjectId })
.sort({ createdAt: -1 })
.limit(parsedLimit)
.toArray();
}
