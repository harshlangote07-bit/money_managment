'use strict';

const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'];
const FLEXIBILITIES = ['fixed', 'somewhat_flexible', 'flexible'];
const isObject = x => x !== null && typeof x === 'object' && !Array.isArray(x);

function validatePathInput(raw) {
  const errors = [];
  const fail = (path, message) => errors.push({ path, message });
  const str = (v, p) => { if (typeof v !== 'string' || !v.trim()) fail(p, 'Expected non-empty string'); };
  const num = (v, p, min = 0, max = Infinity, integer = false) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max || (integer && !Number.isInteger(v))) {
      fail(p, `Expected ${integer ? 'integer' : 'number'} between ${min} and ${max}`);
    }
  };
  const date = (v, p) => {
    str(v, p);
    if (typeof v !== 'string') return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return fail(p, 'Use YYYY-MM-DD');
    const d = new Date(`${v}T00:00:00.000Z`);
    if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== v) fail(p, 'Invalid calendar date');
  };

  if (!isObject(raw)) throw Object.assign(new Error('Input must be an object'), { name: 'ValidationError', details: [{ path: [], message: 'Expected object' }] });
  const input = structuredClone(raw);
  input.currency ??= 'INR';
  for (const k of ['incomeSources', 'expenses', 'debts', 'goals', 'recurringCommitments', 'knownFutureCommitments', 'expenseForecasts']) input[k] ??= [];
  input.assumptions ??= {};

  if (typeof input.currency !== 'string' || !/^[A-Z]{3}$/.test(input.currency)) fail(['currency'], 'Currency must be a 3-letter uppercase code');
  num(input.currentCash, ['currentCash']);
  for (const k of ['incomeSources', 'expenses', 'debts', 'goals', 'recurringCommitments', 'knownFutureCommitments', 'expenseForecasts']) {
    if (!Array.isArray(input[k])) fail([k], 'Expected array');
  }
  if (Array.isArray(input.goals) && (input.goals.length < 1 || input.goals.length > 20)) fail(['goals'], 'Provide between 1 and 20 goals');

  if (!isObject(input.assumptions)) { fail(['assumptions'], 'Expected object'); input.assumptions = {}; }
  const a = input.assumptions;
  const defaults = {
    startDate: new Date().toISOString().slice(0, 10), projectionMonths: 120,
    annualGeneralInflationRate: 0.04, annualSavingsReturnRate: 0,
    minimumEmergencyReserve: 0, reservePriority: 'high', reserveTopUpMonths: 3,
    hardReserveConstraint: false, goalMinimumContributionsAreHard: false,
    maxDiscretionaryReductionRate: 0.20, maxTargetReductionRate: 0.10, maxFlexibleExtensionMonths: 12,
    targetAmountIsInTodayMoney: true, debtPaymentPriority: 'high',
    includeCashInterest: true
  };
  for (const [k, v] of Object.entries(defaults)) a[k] ??= v;
  date(a.startDate, ['assumptions', 'startDate']);
  num(a.projectionMonths, ['assumptions', 'projectionMonths'], 1, 600, true);
  num(a.annualGeneralInflationRate, ['assumptions', 'annualGeneralInflationRate'], -0.99, 5);
  num(a.annualSavingsReturnRate, ['assumptions', 'annualSavingsReturnRate'], 0, 1);
  num(a.minimumEmergencyReserve, ['assumptions', 'minimumEmergencyReserve']);
  num(a.reserveTopUpMonths, ['assumptions', 'reserveTopUpMonths'], 0, 120, true);
  num(a.maxDiscretionaryReductionRate, ['assumptions', 'maxDiscretionaryReductionRate'], 0, 0.8);
  num(a.maxTargetReductionRate, ['assumptions', 'maxTargetReductionRate'], 0, 0.8);
  num(a.maxFlexibleExtensionMonths, ['assumptions', 'maxFlexibleExtensionMonths'], 0, 120, true);
  for (const k of ['hardReserveConstraint', 'goalMinimumContributionsAreHard', 'targetAmountIsInTodayMoney', 'includeCashInterest']) {
    if (typeof a[k] !== 'boolean') fail(['assumptions', k], 'Expected boolean');
  }
  if (!['high', 'medium', 'low'].includes(a.reservePriority)) fail(['assumptions', 'reservePriority'], 'Expected high, medium, or low');
  if (!['high', 'medium', 'low'].includes(a.debtPaymentPriority)) fail(['assumptions', 'debtPaymentPriority'], 'Expected high, medium, or low');

  function items(key, specs) {
    if (!Array.isArray(input[key])) return;
    const seen = new Set();
    input[key].forEach((x, i) => {
      const p = [key, i];
      if (!isObject(x)) return fail(p, 'Expected object');
      str(x.id, [...p, 'id']); str(x.name, [...p, 'name']);
      if (typeof x.id === 'string') { if (seen.has(x.id)) fail([...p, 'id'], `Duplicate ID: ${x.id}`); seen.add(x.id); }
      for (const s of specs) {
        const v = x[s.key], fp = [...p, s.key];
        if (v === undefined && s.optional) continue;
        if (s.type === 'number') num(v, fp, s.min ?? 0, s.max ?? Infinity, s.integer ?? false);
        if (s.type === 'boolean' && typeof v !== 'boolean') fail(fp, 'Expected boolean');
        if (s.type === 'enum' && !s.values.includes(v ?? s.default)) fail(fp, `Expected one of ${s.values.join(', ')}`);
        if (s.type === 'date') date(v, fp);
      }
      x.frequency ??= 'monthly';
      if (key !== 'debts' && !FREQUENCIES.includes(x.frequency)) fail([...p, 'frequency'], 'Invalid frequency');
      if (x.startDate !== undefined) date(x.startDate, [...p, 'startDate']);
      if (x.endDate !== undefined) date(x.endDate, [...p, 'endDate']);
      if (x.startDate && x.endDate && x.endDate < x.startDate) fail([...p, 'endDate'], 'endDate must be on/after startDate');
      if (key === 'debts' && x.paymentSchedule !== undefined) {
        if (!Array.isArray(x.paymentSchedule)) fail([...p, 'paymentSchedule'], 'Expected array');
        else {
          const scheduleMonths = new Set();
          x.paymentSchedule.forEach((row, j) => {
            const rp = [...p, 'paymentSchedule', j];
            if (!isObject(row)) { fail(rp, 'Expected object'); return; }
            if (typeof row.month !== 'string' || !/^\d{4}-\d{2}$/.test(row.month)) fail([...rp, 'month'], 'Use YYYY-MM');
            else if (scheduleMonths.has(row.month)) fail([...rp, 'month'], 'Duplicate payment month');
            else scheduleMonths.add(row.month);
            num(row.payment, [...rp, 'payment']);
          });
        }
      }
    });
  }

  items('incomeSources', [
    { key: 'amount', type: 'number' }, { key: 'annualGrowthRate', type: 'number', min: -0.99, max: 5, optional: true }
  ]);
  items('expenses', [
    { key: 'amount', type: 'number' }, { key: 'essential', type: 'boolean', optional: true },
    { key: 'annualInflationRate', type: 'number', min: -0.99, max: 5, optional: true }
  ]);
  items('debts', [
    { key: 'balance', type: 'number' }, { key: 'annualInterestRate', type: 'number', min: 0, max: 5 },
    { key: 'minimumPayment', type: 'number' }, { key: 'extraPaymentAllowed', type: 'boolean', optional: true },
    { key: 'paymentDay', type: 'number', min: 1, max: 31, integer: true, optional: true }
  ]);
  items('goals', [
    { key: 'targetAmount', type: 'number', min: Number.MIN_VALUE }, { key: 'currentAmount', type: 'number', optional: true },
    { key: 'priority', type: 'number', min: 1, max: 5, integer: true, optional: true },
    { key: 'minimumMonthlyContribution', type: 'number', optional: true },
    { key: 'annualTargetInflationRate', type: 'number', min: -0.99, max: 5, optional: true },
    { key: 'targetDate', type: 'date' },
    { key: 'adjustableTarget', type: 'boolean', optional: true },
    { key: 'minimumTargetAmount', type: 'number', optional: true }
  ]);
  for (const k of ['recurringCommitments', 'knownFutureCommitments']) {
    items(k, [
      { key: 'amount', type: 'number' }, { key: 'annualInflationRate', type: 'number', min: -0.99, max: 5, optional: true },
      { key: 'includedInExpenses', type: 'boolean', optional: true }, { key: 'date', type: 'date', optional: true }
    ]);
  }
  items('expenseForecasts', [
    { key: 'amount', type: 'number' }, { key: 'month', type: 'date' },
    { key: 'essential', type: 'boolean', optional: true }
  ]);

  for (const k of ['incomeSources', 'expenses', 'debts', 'goals', 'recurringCommitments', 'knownFutureCommitments', 'expenseForecasts']) {
    if (!Array.isArray(input[k])) continue;
    input[k].forEach((x, i) => {
      if (k === 'incomeSources') x.annualGrowthRate ??= 0;
      if (k === 'expenses') { x.annualInflationRate ??= a.annualGeneralInflationRate; x.essential ??= true; }
      if (k === 'debts') x.extraPaymentAllowed ??= true;
      if (k === 'goals') {
        x.currentAmount ??= 0; x.priority ??= 3; x.flexibility ??= 'somewhat_flexible';
        x.minimumMonthlyContribution ??= 0; x.annualTargetInflationRate ??= a.annualGeneralInflationRate;
        x.adjustableTarget ??= false; x.minimumTargetAmount ??= 0;
        if (!FLEXIBILITIES.includes(x.flexibility)) fail(['goals', i, 'flexibility'], 'Invalid flexibility');
        if (x.minimumTargetAmount > x.targetAmount) fail(['goals', i, 'minimumTargetAmount'], 'Cannot exceed targetAmount');
        if (x.targetDate < a.startDate) fail(['goals', i, 'targetDate'], 'Target date cannot precede startDate');
      }
      if (k === 'recurringCommitments' || k === 'knownFutureCommitments') {
        x.annualInflationRate ??= a.annualGeneralInflationRate;
        x.includedInExpenses ??= false;
      }
      if (k === 'expenseForecasts') x.essential ??= true;
    });
  }

  if (errors.length) throw Object.assign(new Error('Invalid financial input'), { name: 'ValidationError', details: errors });
  return input;
}

module.exports = { validatePathInput, FREQUENCIES, FLEXIBILITIES };
