import test from "node:test";
import assert from "node:assert/strict";

import {
    baselineFromProfile,
    buildActions,
    evaluatePath
} from "../services/recommendations.service.js";

const profile = {
    monthlyIncome: 85000,
    essentialExpenses: 25000,
    discretionaryExpenses: 10000,
    monthlyDebtPayments: 5000,
    monthlyCommitments: 2000,
    savings: 150000,
    outstandingDebt: 100000
};

const stress = {
    incomeReductionPct: 0.10,
    essentialExpenseIncreasePct: 0.10,
    baselineStressedSurplus:
        85000 * 0.9 - 25000 * 1.1 - 10000 - 5000 - 2000
};

test("baseline calculates monthly surplus correctly", () => {
    const baseline = baselineFromProfile(profile);

    assert.equal(baseline.income, 85000);
    assert.equal(baseline.monthlySurplus, 43000);
    assert.equal(baseline.savings, 150000);
    assert.equal(baseline.outstandingDebt, 100000);
});

test("baseline rejects invalid financial values", () => {
    assert.throws(
        () => baselineFromProfile({
            ...profile,
            monthlyIncome: -1
        })
    );

    assert.throws(
        () => baselineFromProfile({
            ...profile,
            essentialExpenses: Infinity
        })
    );
});

test("exactly three distinct recommendation strategies are produced", () => {
    const baseline = baselineFromProfile(profile);
    const actions = buildActions(baseline);

    assert.equal(actions.length, 3);
    assert.equal(new Set(actions.map((item) => item.id)).size, 3);
    assert.ok(actions.some((item) => item.id === "safety_first"));
    assert.ok(actions.some((item) => item.id === "balanced"));
    assert.ok(actions.some((item) => item.id === "accelerated"));
});

test("all strategies return finite projections and ranking scores", () => {
    const baseline = baselineFromProfile(profile);
    const actions = buildActions(baseline);

    for (const action of actions) {
        const result = evaluatePath(baseline, [], action, stress);

        assert.ok(Number.isFinite(result.projectedPath.monthlySurplus));
        assert.ok(Number.isFinite(result.projectedPath.stressedMonthlySurplus));
        assert.ok(Number.isFinite(result.ranking.score));
        assert.ok(Array.isArray(result.riskFlags));
        assert.ok(Array.isArray(result.proposedActions));
    }
});

test("no-goal profiles never allocate money to nonexistent goals", () => {
    const baseline = baselineFromProfile(profile);
    const actions = buildActions(baseline);

    for (const action of actions) {
        const result = evaluatePath(baseline, [], action, stress);

        assert.equal(
            result.projectedPath.additionalGoalContributions,
            0,
            `${action.id} must not allocate money when no goals exist`
        );

        const goalAction = result.proposedActions.find(
            (item) => item.action === "Additional goal contributions"
        );

        assert.equal(goalAction.monthlyAmount, 0);
    }
});

test("allocations never exceed available cash flow", () => {
    const baseline = baselineFromProfile(profile);
    const actions = buildActions(baseline);
    const available = Math.max(
        0,
        baseline.monthlySurplus
    );

    for (const action of actions) {
        const result = evaluatePath(baseline, [], action, stress);

        const debtAction = result.proposedActions.find(
            (item) => item.action === "Additional debt repayment"
        );

        const goalAction = result.proposedActions.find(
            (item) => item.action === "Additional goal contributions"
        );

        assert.ok(debtAction.monthlyAmount >= 0);
        assert.equal(goalAction.monthlyAmount, 0);

        // With no goals, extra debt allocation must not exceed available
        // baseline surplus plus the proposed discretionary reduction.
        const discretionaryAction = result.proposedActions.find(
            (item) => item.action === "Reduce discretionary expenses"
        );

        assert.ok(
            debtAction.monthlyAmount <= available + discretionaryAction.monthlyAmount + 0.01
        );
    }
});

test("stress projection applies income and essential-expense shocks", () => {
    const baseline = baselineFromProfile(profile);
    const action = buildActions(baseline)[0];
    const result = evaluatePath(baseline, [], action, stress);

    const expectedStressedIncome = 85000 * 0.9;
    const expectedStressedEssentials = 25000 * 1.1;

    const expected = Math.round(
        (
            expectedStressedIncome -
            expectedStressedEssentials -
            result.projectedPath.discretionaryExpenses -
            result.projectedPath.monthlyDebtPayment -
            baseline.commitments -
            result.projectedPath.additionalGoalContributions
        ) * 100
    ) / 100;

    assert.equal(result.projectedPath.stressedMonthlySurplus, expected);
});

test("a baseline deficit is not hidden by negative or invalid allocations", () => {
    const deficitProfile = {
        ...profile,
        monthlyIncome: 30000,
        essentialExpenses: 25000,
        discretionaryExpenses: 10000,
        monthlyDebtPayments: 5000,
        monthlyCommitments: 2000
    };

    const baseline = baselineFromProfile(deficitProfile);
    assert.equal(baseline.monthlySurplus, -12000);

    for (const action of buildActions(baseline)) {
        const result = evaluatePath(baseline, [], action, stress);

        for (const proposed of result.proposedActions) {
            assert.ok(
                proposed.monthlyAmount >= 0,
                `${action.id}: ${proposed.action} must not be negative`
            );
        }

        assert.equal(
            result.feasibility.proposedPathSurvivesDefinedStress,
            result.projectedPath.stressedMonthlySurplus >= 0
        );
    }
});

test("goal contributions are distributed only across existing goals", () => {
    const baseline = baselineFromProfile(profile);
    const actions = buildActions(baseline);

    const goals = [
        {
            _id: "goal-1",
            name: "Emergency Fund",
            targetAmount: 200000,
            currentAmount: 50000,
            monthlyContribution: 12000,
            targetDate: "2027-10-25",
            priority: "high"
        },
        {
            _id: "goal-2",
            name: "Travel",
            targetAmount: 50000,
            currentAmount: 10000,
            monthlyContribution: 2000,
            targetDate: "2027-12-25",
            priority: "medium"
        }
    ];

    for (const action of actions) {
        const result = evaluatePath(baseline, goals, action, stress);
        const goalTotal = result.comparison.estimatedGoalOutcomes.reduce(
            (sum, goal) => sum + goal.additionalMonthlyContribution,
            0
        );

        assert.ok(
            Math.abs(goalTotal - result.projectedPath.additionalGoalContributions) <= 0.02
        );

        assert.equal(result.comparison.estimatedGoalOutcomes.length, 2);
    }
});
