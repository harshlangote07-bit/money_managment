import { getF3Collection } from "../models/collections.js";
import { validateObjectId } from "../utils/validation.js";
import { badRequest, notFound } from "../utils/errors.js";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

function money(value, field) {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n < 0) {
        throw badRequest(`${field} must be a finite, non-negative number.`);
    }
    return n;
}

export function baselineFromProfile(profile) {
    const income = money(profile.monthlyIncome, "monthlyIncome");
    const essentials = money(profile.essentialExpenses, "essentialExpenses");
    const discretionary = money(profile.discretionaryExpenses, "discretionaryExpenses");
    const debt = money(profile.monthlyDebtPayments, "monthlyDebtPayments");
    const commitments = money(profile.monthlyCommitments, "monthlyCommitments");
    const savings = money(profile.savings, "savings");
    const outstandingDebt = money(profile.outstandingDebt, "outstandingDebt");

    return {
        income,
        essentialExpenses: essentials,
        discretionaryExpenses: discretionary,
        debtRepayment: debt,
        commitments,
        savings,
        outstandingDebt,
        monthlySurplus: round2(
            income - essentials - discretionary - debt - commitments
        )
    };
}

export function evaluatePath(base, goals, action, stress) {
    const discretionaryReduction = round2(
        base.discretionaryExpenses * action.discretionaryReductionPct
    );
    const revisedDiscretionary = round2(
        base.discretionaryExpenses - discretionaryReduction
    );

    // New allocations must be funded from the available baseline surplus
    // plus any savings produced by the discretionary reduction.
    const availableBeforeAllocations = round2(
        base.monthlySurplus + discretionaryReduction
    );

    const requestedDebtPayment = Math.max(0, round2(action.extraDebtPayment));
    const requestedGoalContribution = goals.length > 0
        ? Math.max(0, round2(action.extraGoalContribution))
        : 0;

    const totalRequestedAllocations = round2(
        requestedDebtPayment + requestedGoalContribution
    );

    const allocationFactor = totalRequestedAllocations > 0
        ? Math.min(1, Math.max(0, availableBeforeAllocations) / totalRequestedAllocations)
        : 0;

    const extraDebtPayment = round2(requestedDebtPayment * allocationFactor);
    const goalAllocation = round2(requestedGoalContribution * allocationFactor);

    const revisedDebtPayment = round2(base.debtRepayment + extraDebtPayment);

    const revisedSurplus = round2(
        base.income -
        base.essentialExpenses -
        revisedDiscretionary -
        revisedDebtPayment -
        base.commitments -
        goalAllocation
    );

    const stressedIncome = round2(
        base.income * (1 - stress.incomeReductionPct)
    );
    const stressedEssentials = round2(
        base.essentialExpenses * (1 + stress.essentialExpenseIncreasePct)
    );

    // Keep commitments, debt payments, and proposed goal allocations
    // consistent across the stress comparison.
    const stressedSurplus = round2(
        stressedIncome -
        stressedEssentials -
        revisedDiscretionary -
        revisedDebtPayment -
        base.commitments -
        goalAllocation
    );

    const goalResults = goals.map((goal) => {
        const target = money(goal.targetAmount, `goal ${goal.name} targetAmount`);
        const current = money(goal.currentAmount, `goal ${goal.name} currentAmount`);
        const contribution = money(
            goal.monthlyContribution,
            `goal ${goal.name} monthlyContribution`
        );

        const remaining = Math.max(0, target - current);
        const date = goal.targetDate ? new Date(goal.targetDate) : null;
        const now = new Date();

        let monthsRemaining = null;
        if (date && !Number.isNaN(date.getTime())) {
            monthsRemaining = Math.max(
                0,
                (date.getFullYear() - now.getFullYear()) * 12 +
                date.getMonth() - now.getMonth()
            );
        }

        const requiredMonthly = monthsRemaining > 0
            ? round2(remaining / monthsRemaining)
            : null;

        // This path's additional contribution is allocated evenly for now.
        // We explicitly report this assumption instead of implying goal-specific optimization.
        const additionalPerGoal = goals.length > 0
            ? round2(goalAllocation / goals.length)
            : 0;

        const proposedContribution = round2(
            contribution + additionalPerGoal
        );

        return {
            goalId: String(goal._id),
            name: goal.name,
            priority: goal.priority ?? "medium",
            remainingAmount: round2(remaining),
            currentMonthlyContribution: round2(contribution),
            additionalMonthlyContribution: additionalPerGoal,
            proposedMonthlyContribution: proposedContribution,
            monthsRemaining,
            estimatedRequiredMonthlyContribution: requiredMonthly,
            contributionGapBefore: requiredMonthly === null
                ? null
                : round2(Math.max(0, requiredMonthly - contribution)),
            contributionGapAfter: requiredMonthly === null
                ? null
                : round2(Math.max(0, requiredMonthly - proposedContribution))
        };
    });

    const riskFlags = [];

    if (revisedSurplus < 0) {
        riskFlags.push("The proposed path produces a monthly deficit.");
    }
    if (stressedSurplus < 0) {
        riskFlags.push("The proposed path produces a deficit under the defined stress scenario.");
    }
    if (action.extraGoalContribution > 0 && goals.length === 0) {
        riskFlags.push("Goal contributions were requested but no goals exist.");
    }
    if (allocationFactor < 1) {
        riskFlags.push("Requested debt and goal allocations were scaled down to fit available cash flow.");
    }

    const monthlyImprovement = round2(revisedSurplus - base.monthlySurplus);
    const stressImprovement = round2(
        stressedSurplus - stress.baselineStressedSurplus
    );

    // Score components are normalized into interpretable points.
    // Positive cash-flow improvements help; disruption and stress deficits hurt.
    const cashFlowPoints = Math.max(-30, Math.min(30, monthlyImprovement / 1000));
    const stressPoints = Math.max(-40, Math.min(40, stressImprovement / 1000));
    const deficitPenalty = stressedSurplus < 0 ? 20 : 0;
    const disruptionPenalty = action.disruptionScore * 100;

    const score = round2(
        cashFlowPoints + stressPoints - deficitPenalty - disruptionPenalty
    );

    return {
        id: action.id,
        name: action.name,
        objective: action.objective,
        priority: "medium",
        proposedActions: [
            {
                action: "Reduce discretionary expenses",
                monthlyAmount: discretionaryReduction,
                formula: `${base.discretionaryExpenses} ? ${action.discretionaryReductionPct} = ${discretionaryReduction}`,
                explanation: "Reduce the selected proportion of current discretionary spending."
            },
            {
                action: "Additional debt repayment",
                monthlyAmount: extraDebtPayment,
                requestedMonthlyAmount: requestedDebtPayment,
                formula: `${requestedDebtPayment} ? ${allocationFactor} = ${extraDebtPayment}`,
                explanation: "Funded from available monthly cash flow. Interest savings cannot be calculated without loan terms."
            },
            {
                action: "Additional goal contributions",
                monthlyAmount: goalAllocation,
                requestedMonthlyAmount: requestedGoalContribution,
                formula: `${requestedGoalContribution} ? ${allocationFactor} = ${goalAllocation}`,
                explanation: goals.length
                    ? "The additional amount is distributed evenly across recorded goals for comparison; this is not a priority-optimized allocation."
                    : "No goals are recorded, so this allocation should not be applied until a goal exists."
            }
        ],
        currentPath: {
            monthlySurplus: base.monthlySurplus,
            savings: base.savings,
            outstandingDebt: base.outstandingDebt
        },
        projectedPath: {
            monthlySurplus: revisedSurplus,
            discretionaryExpenses: revisedDiscretionary,
            monthlyDebtPayment: revisedDebtPayment,
            additionalGoalContributions: goalAllocation,
            stressedMonthlySurplus: stressedSurplus,
            estimatedAnnualCashFlowChange: round2(monthlyImprovement * 12)
        },
        comparison: {
            monthlySurplusImprovement: monthlyImprovement,
            stressedSurplusImprovement: stressImprovement,
            estimatedGoalOutcomes: goalResults
        },
        benefits: [
            `Monthly surplus changes by ?${monthlyImprovement.toLocaleString("en-IN")}.`,
            `Under the defined stress scenario, monthly surplus changes by ?${stressImprovement.toLocaleString("en-IN")}.`
        ],
        tradeoffs: [
            `Discretionary spending is reduced by ?${discretionaryReduction.toLocaleString("en-IN")} per month.`,
            `Additional debt allocation is ?${extraDebtPayment.toLocaleString("en-IN")} per month.`,
            `Additional goal allocation is ?${goalAllocation.toLocaleString("en-IN")} per month.`
        ],
        riskFlags,
        feasibility: {
            baselineCashFlowPositive: base.monthlySurplus >= 0,
            proposedCashFlowPositive: revisedSurplus >= 0,
            proposedPathSurvivesDefinedStress: stressedSurplus >= 0,
            feasible: revisedSurplus >= 0 && stressedSurplus >= 0
        },
        ranking: {
            score,
            scoreComponents: {
                cashFlowPoints: round2(cashFlowPoints),
                stressPoints: round2(stressPoints),
                deficitPenalty,
                disruptionPenalty: round2(disruptionPenalty)
            },
            explanation: "Deterministic comparison heuristic. It rewards improved cash flow and stress performance, penalizes stress deficits and disruption, and does not claim mathematical optimality."
        },
        status: "proposed"
    };
}

export function buildActions(base) {
    const safeSurplus = Math.max(0, base.monthlySurplus);

    return [
        {
            id: "safety_first",
            name: "Safety First",
            objective: "Increase monthly breathing room and resilience.",
            discretionaryReductionPct: 0.20,
            extraDebtPayment: 0,
            extraGoalContribution: 0,
            disruptionScore: 0.02
        },
        {
            id: "balanced",
            name: "Balanced Progress",
            objective: "Balance spending control with debt and goal progress.",
            discretionaryReductionPct: 0.15,
            extraDebtPayment: round2(safeSurplus * 0.10),
            extraGoalContribution: round2(safeSurplus * 0.10),
            disruptionScore: 0.04
        },
        {
            id: "accelerated",
            name: "Accelerated Financial Progress",
            objective: "Prioritize faster debt reduction and goal funding while preserving cash-flow checks.",
            discretionaryReductionPct: 0.30,
            extraDebtPayment: round2(safeSurplus * 0.15),
            extraGoalContribution: round2(safeSurplus * 0.15),
            disruptionScore: 0.08
        }
    ];
}

async function getLatestEngineResults(profileId) {
    const analyses = await getF3Collection("analyses")
        .find({
            profileId,
            analysisType: {
                $in: [
                    "stress_test",
                    "emergency_replan",
                    "financial_resilience",
                    "financial_analysis"
                ]
            }
        })
        .sort({ createdAt: -1 })
        .limit(30)
        .toArray();

    const latest = {};
    for (const item of analyses) {
        if (!latest[item.analysisType]) {
            latest[item.analysisType] = item;
        }
    }

    return latest;
}

export async function generateRecommendations(profileId, options = {}) {
    const objectId = validateObjectId(profileId, "profileId");

    const profiles = getF3Collection("profiles");
    const profile = await profiles.findOne({ _id: objectId });

    if (!profile) {
        throw notFound("Financial profile not found.");
    }

    const goals = await getF3Collection("goals")
        .find({ profileId: objectId })
        .toArray();

    const base = baselineFromProfile(profile);

    const incomeReductionPct = Number(options.incomeReductionPct ?? 0.10);
    const essentialExpenseIncreasePct = Number(
        options.essentialExpenseIncreasePct ?? 0.10
    );

    if (
        !Number.isFinite(incomeReductionPct) ||
        incomeReductionPct < 0 ||
        incomeReductionPct > 1 ||
        !Number.isFinite(essentialExpenseIncreasePct) ||
        essentialExpenseIncreasePct < 0 ||
        essentialExpenseIncreasePct > 2
    ) {
        throw badRequest(
            "Stress percentages must be valid: incomeReductionPct 0–1, essentialExpenseIncreasePct 0–2."
        );
    }

    const baselineStressedSurplus = round2(
        base.income * (1 - incomeReductionPct) -
        base.essentialExpenses * (1 + essentialExpenseIncreasePct) -
        base.discretionaryExpenses -
        base.debtRepayment -
        base.commitments
    );

    const stress = {
        incomeReductionPct,
        essentialExpenseIncreasePct,
        baselineStressedSurplus
    };

    const engineResults = await getLatestEngineResults(objectId);
    const actions = buildActions(base);

    const candidates = actions.map((action) =>
        evaluatePath(base, goals, action, stress)
    );

    candidates.sort((a, b) => {
        if (a.feasibility.feasible !== b.feasibility.feasible) {
            return a.feasibility.feasible ? -1 : 1;
        }
        return b.ranking.score - a.ranking.score;
    });

    candidates.forEach((item, index) => {
        item.priority = index === 0 ? "high" : index === 1 ? "medium" : "low";
        item.ranking.rank = index + 1;
    });

    const result = {
        feature: "F8 Recommendations and Decision Explanation",
        version: "1.0.0",
        profileId: objectId,
        generatedAt: new Date(),
        baseline: {
            ...base,
            monthlySavingsRatePct: base.income > 0
                ? round2(Math.max(0, base.monthlySurplus) / base.income * 100)
                : null
        },
        stressScenario: {
            incomeReductionPct,
            essentialExpenseIncreasePct,
            baselineStressedSurplus,
            formula: "income × (1 - income reduction) - essential expenses × (1 + expense increase) - discretionary expenses - debt repayments - commitments"
        },
        engineEvidence: Object.entries(engineResults).map(([type, analysis]) => ({
            engineType: type,
            analysisId: String(analysis._id),
            createdAt: analysis.createdAt,
            summary: analysis.result ?? analysis
        })),
        recommendations: candidates,
        rankingMethod: {
            type: "deterministic_heuristic",
            explanation: "Feasible paths rank ahead of infeasible paths, then paths are ranked by transparent cash-flow and stress-improvement heuristics. This score is a comparison aid, not financial certainty."
        },
        limitations: [
            "Projections are scenario estimates, not guarantees.",
            "Debt interest savings cannot be calculated without interest rates, loan terms, and repayment rules.",
            "Goal allocations are illustrative when goal-specific priorities or constraints are unavailable.",
            "Previously saved engine results are evidence snapshots and may not reflect the latest profile unless rerun.",
            "No recommendation executes transactions or changes the actual financial profile."
        ]
    };

    const inserted = await getF3Collection("analyses").insertOne({
        profileId: objectId,
        analysisType: "f8_recommendations",
        inputSummary: {
            baseline: base,
            goalsCount: goals.length,
            stress
        },
        result,
        createdAt: new Date()
    });

    result.analysisId = String(inserted.insertedId);
    return result;
}


/**
 * Record a user's decision about a recommendation.
 * "apply" means accept it for the simulated plan only; it does not
 * mutate the financial profile or execute financial transactions.
 */
export async function decideRecommendation(
    profileId,
    analysisId,
    recommendationId,
    decision,
    reason = ""
) {
    const objectId = validateObjectId(profileId);
    const analysisObjectId = validateObjectId(analysisId);

    if (!["apply", "reject"].includes(decision)) {
        throw badRequest('Decision must be "apply" or "reject".');
    }

    if (
        typeof recommendationId !== "string" ||
        !/^[a-z0-9_-]+$/i.test(recommendationId)
    ) {
        throw badRequest("A valid recommendation ID is required.");
    }

    if (typeof reason !== "string" || reason.length > 500) {
        throw badRequest("Decision reason must be a string of at most 500 characters.");
    }

    const collection = getF3Collection("analyses");
    const analysis = await collection.findOne({
        _id: analysisObjectId,
        profileId: objectId,
        analysisType: "f8_recommendations"
    });

    if (!analysis) {
        throw notFound("F8 recommendation analysis was not found for this profile.");
    }

    const recommendations = analysis.result?.recommendations ?? [];
    const recommendation = recommendations.find(
        (item) => item.id === recommendationId
    );

    if (!recommendation) {
        throw notFound("Recommendation was not found in this analysis.");
    }

    const now = new Date();
    const decisionRecord = {
        recommendationId,
        decision,
        reason: reason.trim(),
        decidedAt: now
    };

    // Only the first decision is accepted. A later change requires a
    // dedicated, audited revision workflow rather than contradictory entries.
    const update = await collection.updateOne(
        {
            _id: analysisObjectId,
            profileId: objectId,
            analysisType: "f8_recommendations",
            "result.recommendations.id": recommendationId,
            "decisions.recommendationId": { $ne: recommendationId }
        },
        {
            $push: { decisions: decisionRecord },
            $set: { updatedAt: now }
        }
    );

    if (update.matchedCount === 0) {
        const latest = await collection.findOne({
            _id: analysisObjectId,
            profileId: objectId,
            analysisType: "f8_recommendations"
        });

        if (!latest) {
            throw notFound("F8 recommendation analysis was not found for this profile.");
        }

        const exists = (latest.result?.recommendations ?? []).some(
            (item) => item.id === recommendationId
        );

        if (!exists) {
            throw notFound("Recommendation was not found in this analysis.");
        }

        throw badRequest(
            "A decision has already been recorded for this recommendation in this analysis."
        );
    }

    return {
        analysisId: String(analysisObjectId),
        recommendationId,
        decision,
        reason: reason.trim(),
        decidedAt: now,
        effect: "Recorded for the simulated plan only. The financial profile was not changed."
    };
}
