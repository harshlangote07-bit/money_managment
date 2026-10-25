import * as profileService from "../services/profile.service.js";
import * as goalsService from "../services/goals.service.js";
import * as transactionsService from "../services/transactions.service.js";
import * as analysisService from "../services/analysis.service.js";
import * as stressService from "../services/stress.service.js";
import * as emergencyService from "../services/emergency.service.js";

import { handleF3Error } from "../utils/errors.js";

function asyncHandler(handler) {
return async (req, res) => {
try {
await handler(req, res);
} catch (error) {
handleF3Error(error, res);
}
};
}

// -------------------- PROFILES --------------------

export const createProfile = asyncHandler(async (req, res) => {
const profile = await profileService.createProfile(req.body);

res.status(201).json({
success: true,
message: "Financial profile created.",
data: profile
});
});

export const getProfile = asyncHandler(async (req, res) => {
const profile = await profileService.getProfileById(
req.params.profileId
);

res.status(200).json({
success: true,
data: profile
});
});

export const listProfiles = asyncHandler(async (req, res) => {
const result = await profileService.listProfiles({
limit: req.query.limit ?? 20,
skip: req.query.skip ?? 0
});

res.status(200).json({
success: true,
data: result.profiles,
pagination: result.pagination
});
});

export const updateProfile = asyncHandler(async (req, res) => {
const profile = await profileService.updateProfile(
req.params.profileId,
req.body
);

res.status(200).json({
success: true,
message: "Financial profile updated.",
data: profile
});
});

export const deleteProfile = asyncHandler(async (req, res) => {
const result = await profileService.deleteProfile(
req.params.profileId
);

res.status(200).json(result);
});

// -------------------- GOALS --------------------

export const createGoal = asyncHandler(async (req, res) => {
const goal = await goalsService.createGoal(
req.params.profileId,
req.body
);

res.status(201).json({
success: true,
message: "Financial goal created.",
data: goal
});
});

export const getGoal = asyncHandler(async (req, res) => {
const goal = await goalsService.getGoalById(
req.params.profileId,
req.params.goalId
);

res.status(200).json({
success: true,
data: goal
});
});

export const listGoals = asyncHandler(async (req, res) => {
const result = await goalsService.listGoals(
req.params.profileId,
{
priority: req.query.priority,
category: req.query.category,
completed: req.query.completed
}
);

res.status(200).json({
success: true,
data: result.goals,
summary: result.summary
});
});

export const updateGoal = asyncHandler(async (req, res) => {
const goal = await goalsService.updateGoal(
req.params.profileId,
req.params.goalId,
req.body
);

res.status(200).json({
success: true,
message: "Financial goal updated.",
data: goal
});
});

export const deleteGoal = asyncHandler(async (req, res) => {
const result = await goalsService.deleteGoal(
req.params.profileId,
req.params.goalId
);

res.status(200).json(result);
});

// -------------------- TRANSACTIONS --------------------

export const createTransaction = asyncHandler(async (req, res) => {
const transaction = await transactionsService.createTransaction(
req.params.profileId,
req.body
);

res.status(201).json({
success: true,
message: "Transaction created.",
data: transaction
});
});

export const createTransactionsBulk = asyncHandler(
async (req, res) => {
const result = await transactionsService.createTransactionsBulk(
req.params.profileId,
req.body.transactions
);


res.status(201).json({
  success: true,
  message: "Transactions imported.",
  data: result
});


}
);

export const getTransaction = asyncHandler(async (req, res) => {
const transaction = await transactionsService.getTransactionById(
req.params.profileId,
req.params.transactionId
);

res.status(200).json({
success: true,
data: transaction
});
});

export const listTransactions = asyncHandler(async (req, res) => {
const result = await transactionsService.listTransactions(
req.params.profileId,
{
type: req.query.type,
category: req.query.category,
startDate: req.query.startDate,
endDate: req.query.endDate,
limit: req.query.limit ?? 100,
skip: req.query.skip ?? 0
}
);

res.status(200).json({
success: true,
data: result.transactions,
pagination: result.pagination
});
});

export const updateTransaction = asyncHandler(async (req, res) => {
const transaction = await transactionsService.updateTransaction(
req.params.profileId,
req.params.transactionId,
req.body
);

res.status(200).json({
success: true,
message: "Transaction updated.",
data: transaction
});
});

export const deleteTransaction = asyncHandler(async (req, res) => {
const result = await transactionsService.deleteTransaction(
req.params.profileId,
req.params.transactionId
);

res.status(200).json(result);
});

export const getTransactionSummary = asyncHandler(async (req, res) => {
const summary = await transactionsService.getTransactionSummary(
req.params.profileId,
{
startDate: req.query.startDate,
endDate: req.query.endDate,
}
);

return res.status(200).json({
success: true,
data: summary,
});
});


// -------------------- FINANCIAL ANALYSIS --------------------

export const runFinancialAnalysis = asyncHandler(
async (req, res) => {
const analysis = await analysisService.runFinancialAnalysis(
req.params.profileId,
{
periodsAhead: req.body.periodsAhead
}
);

```
res.status(200).json({
  success: true,
  message: "Financial analysis completed.",
  data: analysis
});
```

}
);

export const getLatestAnalysis = asyncHandler(async (req, res) => {
const analysis = await analysisService.getLatestAnalysis(
req.params.profileId
);

res.status(200).json({
success: true,
data: analysis
});
});

export const listAnalyses = asyncHandler(async (req, res) => {
const analyses = await analysisService.listAnalyses(
req.params.profileId,
req.query.limit ?? 10
);

res.status(200).json({
success: true,
count: analyses.length,
data: analyses
});
});

// -------------------- STRESS TESTING --------------------

export const runStressTest = asyncHandler(async (req, res) => {
const analysis = await stressService.runStressTest(
req.params.profileId,
req.body
);

res.status(200).json({
success: true,
message: "Financial stress test completed.",
data: analysis
});
});

// -------------------- EMERGENCY REPLANNING --------------------

export const runEmergencyReplan = asyncHandler(
async (req, res) => {
const analysis = await emergencyService.runEmergencyReplan(
req.params.profileId,
req.body
);


res.status(200).json({
  success: true,
  message: "Emergency financial replanning completed.",
  data: analysis
});


}
);

import * as resilienceService from "../services/resilience.service.js";
import * as recommendationsService from "../services/recommendations.service.js";

// -------------------- F7 FINANCIAL RESILIENCE --------------------

export const runResilienceAnalysis = asyncHandler(async (req, res) => {
    const result = await resilienceService.runResilienceAnalysis(
        req.params.profileId,
        {
            incomeStepPct: req.body.incomeStepPct,
            expenseStepPct: req.body.expenseStepPct,
            maxShockPct: req.body.maxShockPct
        }
    );

    res.status(200).json(result);
});


/* -------------------- F8 RECOMMENDATIONS -------------------- */

export const generateRecommendations = asyncHandler(async (req, res) => {
    const result = await recommendationsService.generateRecommendations(
        req.params.profileId,
        req.body ?? {}
    );

    res.status(200).json({
        success: true,
        message: "Financial recommendations generated.",
        data: result
    });
});


export const decideRecommendation = asyncHandler(async (req, res) => {
    const { profileId, analysisId, recommendationId } = req.params;
    const { decision, reason = "" } = req.body ?? {};

    const result = await recommendationsService.decideRecommendation(
        profileId,
        analysisId,
        recommendationId,
        decision,
        reason
    );

    res.status(200).json({
        success: true,
        message: "Recommendation decision recorded.",
        data: result
    });
});
