import express from "express";

import {
createProfile,
getProfile,
listProfiles,
updateProfile,
deleteProfile,

createGoal,
getGoal,
listGoals,
updateGoal,
deleteGoal,

createTransaction,
createTransactionsBulk,
getTransaction,
listTransactions,
updateTransaction,
deleteTransaction,
getTransactionSummary,

runFinancialAnalysis,
getLatestAnalysis,
listAnalyses,

runStressTest,
runEmergencyReplan,
runResilienceAnalysis,
    generateRecommendations,
    decideRecommendation
} from "../controllers/f3.controller.js";

const router = express.Router();

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

router.get("/health", (req, res) => {
res.status(200).json({
success: true,
service: "F3 Financial Planning API",
version: "1.0.0"
});
});

// --------------------------------------------------
// FINANCIAL PROFILES
// --------------------------------------------------

router.post("/profiles", createProfile);

router.get("/profiles", listProfiles);

router.get("/profiles/:profileId", getProfile);

router.put("/profiles/:profileId", updateProfile);

router.delete("/profiles/:profileId", deleteProfile);

// --------------------------------------------------
// FINANCIAL GOALS
// --------------------------------------------------

router.post(
"/profiles/:profileId/goals",
createGoal
);

router.get(
"/profiles/:profileId/goals",
listGoals
);

router.get(
"/profiles/:profileId/goals/:goalId",
getGoal
);

router.put(
"/profiles/:profileId/goals/:goalId",
updateGoal
);

router.delete(
"/profiles/:profileId/goals/:goalId",
deleteGoal
);

// --------------------------------------------------
// TRANSACTIONS
// --------------------------------------------------

router.post(
"/profiles/:profileId/transactions",
createTransaction
);

router.post(
"/profiles/:profileId/transactions/bulk",
createTransactionsBulk
);

router.get(
"/profiles/:profileId/transactions",
listTransactions
);

router.get(
"/profiles/:profileId/transactions/summary",
getTransactionSummary
);

router.get(
"/profiles/:profileId/transactions/:transactionId",
getTransaction
);

router.put(
"/profiles/:profileId/transactions/:transactionId",
updateTransaction
);

router.delete(
"/profiles/:profileId/transactions/:transactionId",
deleteTransaction
);

// --------------------------------------------------
// FINANCIAL ANALYSIS AND FORECASTING
// --------------------------------------------------

router.post(
"/profiles/:profileId/analyze",
runFinancialAnalysis
);

router.get(
"/profiles/:profileId/analyses",
listAnalyses
);

router.get(
"/profiles/:profileId/analyses/latest",
getLatestAnalysis
);

// --------------------------------------------------
// FINANCIAL STRESS TESTING — ENGINE 2
// --------------------------------------------------

router.post(
"/profiles/:profileId/stress-test",
runStressTest
);

// --------------------------------------------------
// EMERGENCY REPLANNING — ENGINE 3
// --------------------------------------------------

router.post(
"/profiles/:profileId/emergency-replan",
runEmergencyReplan
);


// --------------------------------------------------
// FINANCIAL RESILIENCE — ENGINE 7
// --------------------------------------------------

router.post(
    "/profiles/:profileId/resilience-analysis",
    runResilienceAnalysis
);

export default router;


/* -------------------- F8 RECOMMENDATIONS -------------------- */

router.post(
    "/profiles/:profileId/recommendations",
    generateRecommendations
);


router.post(
    "/profiles/:profileId/recommendations/:analysisId/:recommendationId/decision",
    decideRecommendation
);
