'use strict';

const { simulatePlan, STRATEGIES, round } = require('../services/financialCalculator');
const { validatePathInput } = require('../validators/pathInput');

function comparePlans(a, b, assumptions = {}) {
  const x = a.metrics, y = b.metrics;
  const reserve = assumptions.reservePriority || 'medium';
  const debt = assumptions.debtPaymentPriority || 'medium';
  const tupleA = [x.hardConstraintViolation ? 1 : 0];
  const tupleB = [y.hardConstraintViolation ? 1 : 0];
  if (reserve === 'high') { tupleA.push(x.reserveGapMonths); tupleB.push(y.reserveGapMonths); }
  if (debt === 'high') { tupleA.push(x.endingDebt, x.totalInterest); tupleB.push(y.endingDebt, y.totalInterest); }
  tupleA.push(x.totalGoalShortfall, -x.goalsMetByOriginalDeadline);
  tupleB.push(y.totalGoalShortfall, -y.goalsMetByOriginalDeadline);
  if (reserve !== 'high') { tupleA.push(x.reserveGapMonths); tupleB.push(y.reserveGapMonths); }
  if (debt !== 'high') { tupleA.push(x.endingDebt, x.totalInterest); tupleB.push(y.endingDebt, y.totalInterest); }
  tupleA.push(x.totalDiscretionaryReduction); tupleB.push(y.totalDiscretionaryReduction);
  for (let i = 0; i < tupleA.length; i++) if (Math.abs(tupleA[i] - tupleB[i]) > 0.01) return tupleA[i] - tupleB[i];
  return a.strategy.localeCompare(b.strategy);
}
function signature(plan) {
  return JSON.stringify({
    contributions: plan.monthlyProjection.map(m => m.goalContributions),
    cash: plan.monthlyProjection.map(m => Math.round(m.closingCash)),
    debt: plan.monthlyProjection.map(m => Math.round(m.closingDebt)),
    goalBalances: plan.monthlyProjection.map(m => m.goalBalances),
    goalTargets: plan.monthlyProjection.map(m => m.goalTargets),
    targetDates: plan.goalResults.map(g => g.effectiveTargetDate)
  });
}
function generatePaths(rawInput, options = {}) {
  const input = validatePathInput(rawInput);
  const requested = options.strategies || Object.keys(STRATEGIES);
  if (!Array.isArray(requested) || requested.length < 1) throw new Error('Provide at least one strategy');
  const unknown = requested.filter(s => !STRATEGIES[s]);
  if (unknown.length) throw new Error(`Unknown strategy: ${unknown.join(', ')}`);
  const candidates = requested.map(strategy => simulatePlan(input, strategy)).sort((a, b) => comparePlans(a, b, input.assumptions));
  const seen = new Set();
  const distinctCandidates = [];
  for (const p of candidates) {
    const sig = signature(p);
    if (seen.has(sig)) continue;
    seen.add(sig);
    distinctCandidates.push(p);
  }
  // Hard-constraint-violating plans are excluded from the selectable paths
  // whenever at least one feasible candidate exists. If none are feasible,
  // expose the ranked least-bad compromises explicitly instead.
  const feasibleCandidates = distinctCandidates.filter(p => p.metrics.feasible);
  const compromiseCandidates = distinctCandidates.filter(p => !p.metrics.feasible);
  const selectable = feasibleCandidates.length ? feasibleCandidates : compromiseCandidates;
  const paths = selectable.slice(0, 6);
  paths.forEach((p, i) => {
    p.rank = i + 1;
    p.selectionClass = p.metrics.feasible ? 'feasible' : 'best-effort-compromise';
    p.score = round((p.metrics.hardConstraintViolation ? 1e12 : 0) + p.metrics.totalGoalShortfall * 1e6 + (p.metrics.goalsEvaluated - p.metrics.goalsMetByOriginalDeadline) * 1e4 + p.metrics.endingDebt + p.metrics.totalInterest * 0.1);
    p.frontend = {
      goals: p.goalResults.map(g => ({
        id: g.id, name: g.name, priority: g.priority,
        percentFunded: g.percentFundedAtDeadline,
        targetDate: g.targetDate, projectedCompletionDate: g.completionDate,
        shortfall: g.shortfallAtDeadline, metDeadline: g.metDeadline,
        totalContributions: g.totalContributions
      })),
      monthlyTrend: p.monthlyProjection.map(m => ({ month: m.month, cash: m.closingCash, debt: m.closingDebt, contributions: m.goalContributions, balances: m.goalBalances, reserveGap: m.reserveGap }))
    };
  });
  const feasiblePaths = paths.filter(p => p.metrics.feasible);
  const bestCompromises = paths.filter(p => !p.metrics.feasible);
  return {
    currency: input.currency,
    generatedAt: new Date().toISOString(),
    assumptions: {
      ...input.assumptions,
      currentCashIsLiquidAndUnallocated: true,
      goalCurrentAmountsAreEarmarked: true,
      savingsReturnAppliedToLiquidCash: input.assumptions.includeCashInterest,
      goalBalancesEarnNoReturnInThisModel: true
    },
    summary: {
      candidateCount: candidates.length,
      distinctPathCount: paths.length,
      feasiblePathCount: feasiblePaths.length,
      compromisePathCount: bestCompromises.length,
      recommendedPath: feasiblePaths[0]?.strategy ?? null,
      allGoalsMetByDeadline: feasiblePaths.some(p => p.metrics.allOriginalDeadlinesMet),
      allPathsFeasible: feasibleCandidates.length === distinctCandidates.length,
      rankingMethod: 'Lexicographic: hard constraints, goal shortfall, goals met by original deadline, reserve risk, ending debt, interest, lifestyle disruption.',
      caveat: 'Deterministic strategy heuristics; not a proof of global optimality. Identical outcomes are deduplicated. If all candidates violate constraints, paths are labeled best-effort compromises and none is recommended as feasible.'
    },
    paths,
    feasiblePaths: feasiblePaths.map(p => ({ rank: p.rank, strategy: p.strategy, label: p.label, score: p.score })),
    bestEffortCompromises: bestCompromises.map(p => ({ rank: p.rank, strategy: p.strategy, label: p.label, score: p.score, violations: p.hardViolations }))
  };
}
module.exports = { generatePaths, comparePlans, STRATEGIES };
