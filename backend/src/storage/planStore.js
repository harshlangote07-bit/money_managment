'use strict';
const fs = require('node:fs');
const path = require('node:path');
const STORE_FILE = path.join(__dirname, '../../data/active-plan.json');
function saveActivePlan(pathResult, sourceInput) {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  const record = {
    planId: `plan-${Date.now()}`,
    selectedAt: new Date().toISOString(),
    strategy: pathResult.strategy,
    label: pathResult.label,
    selectionClass: pathResult.selectionClass,
    metrics: pathResult.metrics,
    goalResults: pathResult.goalResults,
    monthlyProjection: pathResult.monthlyProjection,
    assumptions: sourceInput.assumptions,
    goals: sourceInput.goals
  };
  fs.writeFileSync(STORE_FILE, JSON.stringify(record, null, 2));
  return record;
}
function getActivePlan() {
  if (!fs.existsSync(STORE_FILE)) return null;
  return JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
}
module.exports = { saveActivePlan, getActivePlan };
