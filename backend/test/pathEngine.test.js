'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { generatePaths } = require('../src/engines/pathEngine');
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '../examples/multi-goal-input.json'), 'utf8'));

test('valid multi-goal input generates distinct strategy outcomes', () => {
  const r = generatePaths(sample);
  assert.equal(r.summary.candidateCount, 6);
  assert.ok(r.summary.distinctPathCount >= 2, `expected distinct paths, got ${r.summary.distinctPathCount}`);
  assert.equal(r.paths.length, r.summary.distinctPathCount);
  assert.ok(r.paths.every(p => p.goalResults.length === 3));
});

test('monthly projection reconciles the cash movement fields', () => {
  const r = generatePaths(sample);
  for (const p of r.paths) {
    for (const m of p.monthlyProjection) {
      assert.ok(Number.isFinite(m.closingCash));
      assert.ok(Number.isFinite(m.closingDebt));
      assert.ok(m.goalContributions && m.goalBalances);
      assert.ok(m.goalContributions.emergency >= 0);
    }
  }
});

test('hard reserve constraint rejects paths that fall below reserve', () => {
  const input = structuredClone(sample);
  input.currentCash = 0;
  input.assumptions.minimumEmergencyReserve = 100000;
  input.assumptions.hardReserveConstraint = true;
  const r = generatePaths(input);
  assert.ok(r.paths.every(p => !p.metrics.feasible));
});

test('negative cash is never reported as feasible', () => {
  const input = structuredClone(sample);
  input.currentCash = 0;
  input.incomeSources[0].amount = 10000;
  input.expenses = [{ id: 'rent', name: 'Rent', amount: 30000, frequency: 'monthly', essential: true }];
  input.debts = [{ id: 'loan', name: 'Loan', balance: 100000, annualInterestRate: 0.2, minimumPayment: 10000 }];
  const r = generatePaths(input);
  assert.ok(r.paths.every(p => !p.metrics.feasible));
  assert.ok(r.paths.some(p => p.metrics.firstNegativeCash));
});

test('invalid duplicate goal IDs are rejected', () => {
  const input = structuredClone(sample);
  input.goals[1].id = input.goals[0].id;
  assert.throws(() => generatePaths(input), e => e.name === 'ValidationError');
});

test('goal deadline beyond horizon is explicitly not evaluated', () => {
  const input = structuredClone(sample);
  input.assumptions.projectionMonths = 2;
  const r = generatePaths(input);
  assert.ok(r.paths.every(p => p.goalResults.some(g => g.deadlineEvaluated === false)));
});

test('cash projection reconciles to all inflows and outflows', () => {
  const r = generatePaths(sample);
  for (const p of r.paths) {
    for (const m of p.monthlyProjection) {
      const expected = m.openingCash + m.cashInterest + m.income
        - m.essentialExpenses - m.discretionaryExpenses + m.discretionaryReduction
        - m.recurringCommitments - m.knownFutureCommitments
        - m.mandatoryDebtPayments - m.extraDebtPayments
        - Object.values(m.goalContributions).reduce((sum, n) => sum + n, 0);
      assert.ok(Math.abs(expected - m.closingCash) < 0.1, `${p.strategy} ${m.month}: ${expected} != ${m.closingCash}`);
    }
  }
});

test('strategy alternatives are deduplicated by projected outcomes, not labels', () => {
  const r = generatePaths(sample);
  const signatures = r.paths.map(p => JSON.stringify({ months: p.monthlyProjection.map(m => [m.goalContributions, m.goalBalances, m.goalTargets, m.closingCash, m.closingDebt]), targetDates: p.goalResults.map(g => g.effectiveTargetDate) }));
  assert.equal(new Set(signatures).size, signatures.length);
});
