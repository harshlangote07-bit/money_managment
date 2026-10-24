'use strict';
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { generatePaths } = require('./engines/pathEngine');
const { saveActivePlan } = require('./storage/planStore');
const inputFile = process.argv[2] || path.join(__dirname, '../examples/multi-goal-input.json');
const input = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
const result = generatePaths(input);
const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: input.currency, maximumFractionDigits: 0 }).format(n);
console.log('\nPATH ENGINE — MULTI-GOAL PLAN COMPARISON');
console.log(`Candidates: ${result.summary.candidateCount}; distinct outcomes: ${result.summary.distinctPathCount}; feasible: ${result.summary.feasiblePathCount}; compromises: ${result.summary.compromisePathCount}`);
console.log('\nRank | Strategy | Feasible | Goals met | Shortfall | Ending cash | Ending debt');
for (const p of result.paths) console.log(`${p.rank} | ${p.label} | ${p.metrics.feasible} | ${p.metrics.goalsMetByOriginalDeadline}/${p.metrics.goalsEvaluated} | ${money(p.metrics.totalGoalShortfall)} | ${money(p.metrics.endingCash)} | ${money(p.metrics.endingDebt)}`);
console.log('\nGOAL RESULTS');
for (const p of result.paths) {
  console.log(`\n${p.rank}. ${p.label}: ${p.description}`);
  for (const g of p.goalResults) console.log(`  ${g.name}: funded ${g.percentFundedAtDeadline ?? 'N/A'}%; deadline ${g.targetDate}; completion ${g.completionDate || 'not reached in horizon'}; shortfall ${g.shortfallAtDeadline === null ? 'not evaluated' : money(g.shortfallAtDeadline)}; met=${g.metDeadline}`);
  if (p.warnings.length) for (const w of p.warnings) console.log(`  WARNING: ${w}`);
}
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('\nChoose path rank to save as active plan (or press Enter to exit): ', answer => {
  const chosen = result.paths.find(p => p.rank === Number(answer));
  if (!chosen) { console.log('No plan activated.'); rl.close(); return; }
  if (!chosen.metrics.feasible) {
    rl.question('This path violates hard constraints. Type COMPROMISE to save it explicitly: ', confirm => {
      if (confirm === 'COMPROMISE') { const saved = saveActivePlan(chosen, input); console.log(`Saved explicit compromise ${saved.planId} to data/active-plan.json`); }
      else console.log('Not saved.');
      rl.close();
    });
    return;
  }
  const saved = saveActivePlan(chosen, input);
  console.log(`Activated ${saved.label} (${saved.planId}); saved to data/active-plan.json`);
  rl.close();
});
