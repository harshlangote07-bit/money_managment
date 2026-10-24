'use strict';

const round = n => Math.round((n + Number.EPSILON) * 100) / 100;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const STRATEGIES = {
  balanced: { label: 'Balanced', description: 'Allocate available goal funding across goals using priority, urgency and remaining need.' },
  'goal-first': { label: 'Goal-first', description: 'Concentrate contributions on the highest-priority goal before funding the next.' },
  'emergency-first': { label: 'Emergency-first', description: 'Fund goals named emergency or reserve first, then other goals by priority.' },
  'deadline-flexible': { label: 'Deadline-flexible', description: 'Protect fixed deadlines and extend flexible goal deadlines where permitted.' },
  'spending-adjusted': { label: 'Spending-adjusted', description: 'Reduce discretionary spending within the configured cap to increase available funding.' },
  hybrid: { label: 'Hybrid', description: 'Balance goals while applying some available surplus to high-interest debt.' }
};
const FACTOR = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 };
const dateAtMonth = (start, offset) => { const d = new Date(`${start}T00:00:00.000Z`); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + offset); return d; };
const monthKey = d => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
const dateKey = d => d.toISOString().slice(0, 10);
const monthDiff = (a, b) => { const x = new Date(`${a.slice(0, 7)}-01T00:00:00.000Z`); const y = new Date(`${b.slice(0, 7)}-01T00:00:00.000Z`); return (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth(); };
const monthlyRate = annual => Math.pow(1 + annual, 1 / 12) - 1;
function active(x, date) { const k = dateKey(date); return (!x.startDate || k >= x.startDate) && (!x.endDate || k <= x.endDate); }
function indexedAmount(x, date, i, rateKey, defaultRate = 0) {
  if (!active(x, date)) return 0;
  const freq = FACTOR[x.frequency || 'monthly'] || 1;
  const rate = x[rateKey] ?? defaultRate;
  return x.amount * freq * Math.pow(1 + rate, i / 12);
}
function targetAmount(goal, date, input, strategy) {
  const a = input.assumptions;
  const elapsed = Math.max(0, monthDiff(a.startDate, dateKey(date)));
  let target = goal.targetAmount;
  if (a.targetAmountIsInTodayMoney) target *= Math.pow(1 + (goal.annualTargetInflationRate ?? a.annualGeneralInflationRate), elapsed / 12);
  if (strategy === 'spending-adjusted' && goal.adjustableTarget) {
    target = Math.max(goal.minimumTargetAmount || 0, target * (1 - a.maxTargetReductionRate));
  }
  return target;
}
function effectiveDeadline(goal, strategy, a) {
  if (strategy === 'deadline-flexible' && goal.flexibility !== 'fixed') {
    const d = new Date(`${goal.targetDate}T00:00:00.000Z`);
    d.setUTCMonth(d.getUTCMonth() + a.maxFlexibleExtensionMonths);
    return dateKey(d);
  }
  return goal.targetDate;
}
function allocate(input, strategy, budget, balances, targets, date, deadlines) {
  const goals = input.goals;
  const contributions = Object.fromEntries(goals.map(g => [g.id, 0]));
  const need = g => Math.max(0, targets[g.id] - balances[g.id]);
  const due = g => Math.max(1, monthDiff(monthKey(date), deadlines[g.id].slice(0, 7)) + 1);
  const urgency = g => 1 / due(g);
  const priority = g => g.priority ?? 3;
  // Continue funding missed goals after their deadline so the engine can estimate delayed completion dates.
  // The deadline still affects urgency and the reported original-deadline shortfall.
  let pool = goals.filter(g => need(g) > 0.01);
  let remaining = Math.max(0, budget);
  if (!pool.length || remaining <= 0.01) return { contributions, unallocated: remaining };

  if (strategy === 'emergency-first') {
    pool.sort((x, y) => (/(emergency|reserve|rainy day)/i.test(y.name) ? 1 : 0) - (/(emergency|reserve|rainy day)/i.test(x.name) ? 1 : 0) || priority(y) - priority(x) || urgency(y) - urgency(x));
  } else if (strategy === 'goal-first') {
    pool.sort((x, y) => priority(y) - priority(x) || urgency(y) - urgency(x));
  } else if (strategy === 'deadline-flexible') {
    pool.sort((x, y) => (x.flexibility === 'fixed' ? 0 : 1) - (y.flexibility === 'fixed' ? 0 : 1) || due(x) - due(y) || priority(y) - priority(x));
  } else if (strategy === 'hybrid') {
    pool.sort((x, y) => (priority(y) * 0.7 + urgency(y) * 2) - (priority(x) * 0.7 + urgency(x) * 2));
  }

  if (strategy === 'balanced' || strategy === 'spending-adjusted' || strategy === 'hybrid') {
    // Water-fill using priority/urgency weights, capping each goal at its remaining need.
    for (let pass = 0; pass < goals.length + 2 && remaining > 0.01; pass++) {
      const eligible = pool.filter(g => need(g) - contributions[g.id] > 0.01);
      if (!eligible.length) break;
      const weights = eligible.map(g => ({ g, w: Math.max(0.1, priority(g) * 0.75 + urgency(g) * 4) }));
      const total = weights.reduce((s, x) => s + x.w, 0);
      let spent = 0;
      for (const { g, w } of weights) {
        const share = Math.min(need(g) - contributions[g.id], remaining * w / total);
        contributions[g.id] += share;
        spent += share;
      }
      remaining -= spent;
      if (spent < 0.01) break;
    }
  } else {
    for (const g of pool) {
      if (remaining <= 0.01) break;
      const amount = Math.min(need(g), remaining);
      contributions[g.id] += amount;
      remaining -= amount;
    }
  }
  return { contributions, unallocated: Math.max(0, remaining) };
}

function simulatePlan(input, strategy) {
  if (!STRATEGIES[strategy]) throw new Error(`Unknown strategy: ${strategy}`);
  const a = input.assumptions;
  const balances = Object.fromEntries(input.goals.map(g => [g.id, g.currentAmount || 0]));
  const startingGoalBalances = { ...balances };
  const debts = Object.fromEntries(input.debts.map(d => [d.id, d.balance]));
  let cash = input.currentCash;
  let minCash = cash;
  let totalInterest = 0, totalDebtPaid = 0, totalDiscretionaryReduction = 0, totalCommitments = 0;
  const interestByDebt = Object.fromEntries(input.debts.map(d => [d.id, 0]));
  const paymentsByDebt = Object.fromEntries(input.debts.map(d => [d.id, 0]));
  let firstNegativeCash = null, firstReserveBreach = null, firstUnpaidDebt = null;
  let reserveGapMonths = 0;
  const hardViolations = [];
  const completionDates = Object.fromEntries(input.goals.map(g => [g.id, balances[g.id] >= g.targetAmount ? a.startDate : null]));
  const goalContributionTotals = Object.fromEntries(input.goals.map(g => [g.id, 0]));
  const monthlyProjection = [];

  for (let i = 0; i < a.projectionMonths; i++) {
    const date = dateAtMonth(a.startDate, i), month = monthKey(date);
    const openingCash = cash;
    const cashInterest = a.includeCashInterest ? Math.max(0, cash) * monthlyRate(a.annualSavingsReturnRate) : 0;
    cash += cashInterest;
    const income = input.incomeSources.reduce((s, x) => s + indexedAmount(x, date, i, 'annualGrowthRate'), 0);
    let essentialExpenses = 0, discretionaryExpenses = 0;
    for (const e of input.expenses) {
      const amount = indexedAmount(e, date, i, 'annualInflationRate', a.annualGeneralInflationRate);
      if (e.essential) essentialExpenses += amount; else discretionaryExpenses += amount;
    }
    for (const forecast of input.expenseForecasts) {
      if (forecast.month.slice(0, 7) === month) {
        if (forecast.essential) essentialExpenses += forecast.amount;
        else discretionaryExpenses += forecast.amount;
      }
    }
    const cutRate = strategy === 'spending-adjusted' ? a.maxDiscretionaryReductionRate : 0;
    const discretionaryReduction = discretionaryExpenses * cutRate;
    totalDiscretionaryReduction += discretionaryReduction;
    const actualDiscretionary = discretionaryExpenses - discretionaryReduction;

    const recurring = input.recurringCommitments.reduce((s, x) => s + (x.includedInExpenses ? 0 : indexedAmount(x, date, i, 'annualInflationRate', a.annualGeneralInflationRate)), 0);
    const oneOffs = input.knownFutureCommitments.reduce((s, x) => {
      if (x.includedInExpenses || !x.date || x.date.slice(0, 7) !== month) return s;
      return s + x.amount * Math.pow(1 + (x.annualInflationRate ?? a.annualGeneralInflationRate), i / 12);
    }, 0);
    totalCommitments += recurring + oneOffs;

    // Debt interest is calculated on opening principal. Scheduled EMI is mandatory.
    let interestThisMonth = 0, mandatoryPayments = 0, unpaidMinimums = 0;
    const debtMonthly = {};
    for (const debt of input.debts) {
      let balance = debts[debt.id];
      if (balance <= 0.005) { debts[debt.id] = 0; debtMonthly[debt.id] = { interest: 0, payment: 0, closingBalance: 0 }; continue; }
      const interest = balance * monthlyRate(debt.annualInterestRate);
      balance += interest; interestThisMonth += interest; interestByDebt[debt.id] += interest;
      let scheduled = debt.minimumPayment;
      if (Array.isArray(debt.paymentSchedule)) {
        const row = debt.paymentSchedule.find(r => r.month === month);
        if (row && Number.isFinite(row.payment)) scheduled = row.payment;
      }
      const payment = Math.min(balance, scheduled);
      // Paying off a loan early is not an unpaid EMI; only the household cash-flow check below determines payment affordability.
      balance -= payment;
      debts[debt.id] = Math.max(0, balance);
      mandatoryPayments += payment;
      paymentsByDebt[debt.id] += payment;
      debtMonthly[debt.id] = { interest, payment, extraPayment: 0, closingBalance: debts[debt.id] };
    }
    totalInterest += interestThisMonth;

    const beforeCommitments = cash + income - essentialExpenses - actualDiscretionary - recurring - oneOffs;
    cash = beforeCommitments - mandatoryPayments;
    totalDebtPaid += mandatoryPayments;
    if (cash + income - essentialExpenses - actualDiscretionary - recurring - oneOffs + 0.005 < mandatoryPayments && firstUnpaidDebt === null) {
      firstUnpaidDebt = month;
      hardViolations.push({ month, type: 'mandatory_debt_payment_unaffordable', amount: round(mandatoryPayments - (cash + income - essentialExpenses - actualDiscretionary - recurring - oneOffs)) });
    }

    // The model does not allow borrowing to fund goals. Negative cash is an explicit violation.
    if (cash < -0.005 && firstNegativeCash === null) {
      firstNegativeCash = month;
      hardViolations.push({ month, type: 'negative_cash', amount: round(-cash) });
    }

    // Reserve target is at least the configured floor and can also represent
    // a chosen number of months of essential expenses.
    const reserve = Math.max(a.minimumEmergencyReserve, essentialExpenses * a.reserveTopUpMonths);
    if (cash + 0.005 < reserve) {
      reserveGapMonths++;
      if (firstReserveBreach === null) firstReserveBreach = month;
      if (a.hardReserveConstraint) hardViolations.push({ month, type: 'minimum_reserve_breach', amount: round(reserve - cash) });
    }

    let extraDebtPayments = 0;
    if (strategy === 'hybrid' && cash > reserve && input.debts.some(d => d.extraPaymentAllowed)) {
      const extraShare = a.debtPaymentPriority === 'high' ? 0.35 : a.debtPaymentPriority === 'low' ? 0.10 : 0.20;
      const extraBudget = Math.max(0, cash - reserve) * extraShare;
      let left = extraBudget;
      const eligible = input.debts.filter(d => d.extraPaymentAllowed && debts[d.id] > 0.005).sort((x, y) => y.annualInterestRate - x.annualInterestRate);
      for (const d of eligible) {
        if (left <= 0.005) break;
        const pay = Math.min(debts[d.id], left);
        debts[d.id] -= pay; cash -= pay; left -= pay; extraDebtPayments += pay; paymentsByDebt[d.id] += pay;
        debtMonthly[d.id].extraPayment = pay; debtMonthly[d.id].closingBalance = debts[d.id];
      }
      totalDebtPaid += extraDebtPayments;
    }

    const targets = Object.fromEntries(input.goals.map(g => [g.id, targetAmount(g, date, input, strategy)]));
    const deadlines = Object.fromEntries(input.goals.map(g => [g.id, effectiveDeadline(g, strategy, a)]));
    const reserveForAllocation = a.hardReserveConstraint ? reserve : reserve;
    const availableForGoals = Math.max(0, cash - reserveForAllocation);
    const allocation = allocate(input, strategy, availableForGoals, balances, targets, date, deadlines);
    const contribution = allocation.contributions;
    let totalContribution = 0;
    const minContributionMisses = [];
    for (const g of input.goals) {
      const amount = contribution[g.id] || 0;
      balances[g.id] += amount;
      goalContributionTotals[g.id] += amount;
      totalContribution += amount;
      if (completionDates[g.id] === null && balances[g.id] + 0.005 >= targets[g.id]) completionDates[g.id] = month;
      if (a.goalMinimumContributionsAreHard && balances[g.id] - amount < targets[g.id] - 0.005 && month <= deadlines[g.id].slice(0, 7) && amount + 0.005 < g.minimumMonthlyContribution) {
        minContributionMisses.push({ goalId: g.id, required: g.minimumMonthlyContribution, actual: round(amount) });
        hardViolations.push({ month, type: 'goal_minimum_contribution_not_met', goalId: g.id, required: g.minimumMonthlyContribution, actual: round(amount) });
      }
    }
    cash -= totalContribution;
    minCash = Math.min(minCash, cash);
    if (cash < -0.005 && firstNegativeCash === null) {
      firstNegativeCash = month;
      hardViolations.push({ month, type: 'negative_cash_after_goal_allocation', amount: round(-cash) });
    }

    monthlyProjection.push({
      month, openingCash: round(openingCash), cashInterest: round(cashInterest), income: round(income),
      essentialExpenses: round(essentialExpenses), discretionaryExpenses: round(discretionaryExpenses),
      discretionaryReduction: round(discretionaryReduction), recurringCommitments: round(recurring),
      knownFutureCommitments: round(oneOffs), debtInterest: round(interestThisMonth),
      mandatoryDebtPayments: round(mandatoryPayments), extraDebtPayments: round(extraDebtPayments),
      debtDetails: Object.fromEntries(Object.entries(debtMonthly).map(([id, x]) => [id, Object.fromEntries(Object.entries(x).map(([k, v]) => [k, round(v)]))])),
      goalContributions: Object.fromEntries(Object.entries(contribution).map(([k, v]) => [k, round(v)])),
      goalBalances: Object.fromEntries(Object.entries(balances).map(([k, v]) => [k, round(v)])),
      goalTargets: Object.fromEntries(Object.entries(targets).map(([k, v]) => [k, round(v)])),
      closingCash: round(cash), closingDebt: round(Object.values(debts).reduce((s, v) => s + v, 0)),
      reserveGap: round(Math.max(0, reserve - cash)), unallocatedGoalBudget: round(allocation.unallocated),
      minimumContributionMisses: minContributionMisses
    });
  }

  const endDate = dateAtMonth(a.startDate, a.projectionMonths - 1);
  const finalMonth = monthKey(endDate);
  const goalResults = input.goals.map(g => {
    const originalDeadlineMonth = g.targetDate.slice(0, 7);
    const effectiveDate = effectiveDeadline(g, strategy, a);
    const effectiveDeadlineMonth = effectiveDate.slice(0, 7);
    const originalProjection = monthlyProjection.find(m => m.month === originalDeadlineMonth);
    const effectiveProjection = monthlyProjection.find(m => m.month === effectiveDeadlineMonth);
    const originalTarget = targetAmount(g, new Date(`${g.targetDate}T00:00:00.000Z`), input, 'balanced');
    const effectiveTarget = targetAmount(g, new Date(`${effectiveDate}T00:00:00.000Z`), input, strategy);
    const originalBalance = originalProjection ? originalProjection.goalBalances[g.id] : null;
    const effectiveBalance = effectiveProjection ? effectiveProjection.goalBalances[g.id] : null;
    const deadlineEvaluated = originalProjection !== undefined;
    const metDeadline = deadlineEvaluated ? originalBalance + 0.005 >= originalTarget : null;
    const completion = completionDates[g.id];
    const delayMonths = completion ? Math.max(0, monthDiff(g.targetDate, `${completion}-01`)) : null;
    return {
      id: g.id, name: g.name, priority: g.priority, flexibility: g.flexibility,
      targetAmount: round(originalTarget), initialFunding: round(startingGoalBalances[g.id]),
      targetDate: g.targetDate, effectiveTargetDate: effectiveDate,
      completionDate: completion, delayMonths,
      projectedBalanceAtDeadline: originalBalance === null ? null : round(originalBalance),
      shortfallAtDeadline: originalBalance === null ? null : round(Math.max(0, originalTarget - originalBalance)),
      metDeadline, deadlineEvaluated,
      effectiveDeadlineMet: effectiveBalance === null ? null : effectiveBalance + 0.005 >= effectiveTarget,
      percentFundedAtDeadline: originalBalance === null ? null : round(clamp(originalBalance / Math.max(originalTarget, 0.01) * 100, 0, 100)),
      finalProjectedBalance: round(balances[g.id]),
      finalTarget: round(targetAmount(g, endDate, input, strategy)),
      finalShortfall: round(Math.max(0, targetAmount(g, endDate, input, strategy) - balances[g.id])),
      totalContributions: round(goalContributionTotals[g.id]),
      adjustedTarget: strategy === 'spending-adjusted' && g.adjustableTarget ? round(targetAmount(g, endDate, input, strategy)) : null
    };
  });

  const endingDebt = Object.values(debts).reduce((s, v) => s + v, 0);
  const evaluatedGoals = goalResults.filter(g => g.deadlineEvaluated);
  const goalsMetByOriginalDeadline = evaluatedGoals.filter(g => g.metDeadline).length;
  const totalGoalShortfall = evaluatedGoals.reduce((s, g) => s + (g.shortfallAtDeadline || 0), 0);
  const hardConstraintViolation = hardViolations.some(v => v.type === 'negative_cash' || v.type === 'negative_cash_after_goal_allocation' || v.type === 'mandatory_debt_payment_unaffordable' || (a.hardReserveConstraint && v.type === 'minimum_reserve_breach') || v.type === 'goal_minimum_contribution_not_met');
  const metrics = {
    feasible: !hardConstraintViolation, hardConstraintViolation,
    goalsMetByOriginalDeadline, goalsEvaluated: evaluatedGoals.length, goalCount: input.goals.length,
    allOriginalDeadlinesMet: evaluatedGoals.length === input.goals.length && goalsMetByOriginalDeadline === input.goals.length,
    totalGoalShortfall: round(totalGoalShortfall), endingCash: round(cash), minimumCash: round(minCash),
    endingDebt: round(endingDebt), totalInterest: round(totalInterest), totalDebtPaid: round(totalDebtPaid),
    totalDiscretionaryReduction: round(totalDiscretionaryReduction), totalCommitments: round(totalCommitments),
    reserveGapMonths, firstNegativeCash, firstReserveBreach, firstUnpaidDebt,
    hardViolationCount: hardViolations.length
  };
  const warnings = [];
  if (totalGoalShortfall > 0.01) warnings.push(`${evaluatedGoals.filter(g => !g.metDeadline).length} goal(s) miss original deadline(s).`);
  if (firstNegativeCash) warnings.push(`Cash becomes negative in ${firstNegativeCash}.`);
  if (firstReserveBreach) warnings.push(`Cash falls below the configured reserve in ${firstReserveBreach}.`);
  if (firstUnpaidDebt) warnings.push(`A mandatory debt payment is not fully covered in ${firstUnpaidDebt}.`);
  if (strategy === 'spending-adjusted') warnings.push(`Eligible discretionary spending is reduced by up to ${(a.maxDiscretionaryReductionRate * 100).toFixed(0)}% during the projection.`);
  if (strategy === 'deadline-flexible') warnings.push(`Flexible goals may use an extended deadline up to ${a.maxFlexibleExtensionMonths} months; original-deadline results remain visible.`);
  if (strategy === 'hybrid') warnings.push(`Hybrid uses ${a.debtPaymentPriority === 'high' ? 35 : a.debtPaymentPriority === 'low' ? 10 : 20}% of cash above the reserve for extra eligible high-interest debt repayments.`);

  return {
    strategy, label: STRATEGIES[strategy].label, description: STRATEGIES[strategy].description,
    metrics, goalResults, monthlyProjection, hardViolations, warnings,
    debtResults: input.debts.map(d => ({ id: d.id, name: d.name, startingBalance: round(d.balance), endingBalance: round(debts[d.id]), annualInterestRate: d.annualInterestRate })),
    tradeoffs: {
      discretionaryReduction: round(totalDiscretionaryReduction),
      flexibleDeadlineExtensions: goalResults.filter(g => g.effectiveTargetDate !== g.targetDate).map(g => ({ goalId: g.id, from: g.targetDate, to: g.effectiveTargetDate })),
      targetAdjustments: goalResults.filter(g => g.adjustedTarget !== null).map(g => ({ goalId: g.id, target: g.adjustedTarget }))
    }
  };
}

module.exports = { simulatePlan, STRATEGIES, round, targetAmount };
