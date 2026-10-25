import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");

async function readJson(filename) {
const content = await readFile(path.join(DATA_DIR, filename), "utf8");
return JSON.parse(content);
}

async function runTests() {
console.log("\n=== F3 Demo Data Tests ===\n");

const profiles = await readJson("demo-profile.json");
const goals = await readJson("demo-goals.json");
const transactionGroups = await readJson("demo-transactions.json");

assert.ok(Array.isArray(profiles), "Profiles must be an array");
assert.ok(Array.isArray(goals), "Goals must be an array");
assert.ok(Array.isArray(transactionGroups), "Transaction groups must be an array");
console.log("PASS: All three JSON files contain arrays.");

const profileIds = new Set();

for (const profile of profiles) {
assert.ok(profile.demoId, "Every profile must have a demoId");
assert.ok(!profileIds.has(profile.demoId), `Duplicate profile ID: ${profile.demoId}`);
profileIds.add(profile.demoId);


assert.ok(profile.name?.trim(), `${profile.demoId}: name is required`);

for (const field of [
  "monthlyIncome",
  "essentialExpenses",
  "discretionaryExpenses",
  "monthlyDebtPayments",
  "monthlyCommitments",
  "savings",
  "outstandingDebt",
]) {
  const value = profile[field] ?? 0;

  assert.ok(
    typeof value === "number" && Number.isFinite(value) && value >= 0,
    `${profile.demoId}: ${field} must be a non-negative number`
  );
}


}

console.log(`PASS: ${profiles.length} profiles validated.`);

for (const goal of goals) {
assert.ok(profileIds.has(goal.demoId), `Unknown profile for goal: ${goal.demoId}`);
assert.ok(goal.name?.trim(), "Goal name is required");
assert.ok(goal.category, `Missing category for goal: ${goal.name}`);
assert.ok(Number.isFinite(goal.targetAmount) && goal.targetAmount > 0);
assert.ok(Number.isFinite(goal.currentAmount) && goal.currentAmount >= 0);
assert.ok(
goal.currentAmount <= goal.targetAmount,
`${goal.name}: currentAmount exceeds targetAmount`
);
assert.ok(
Number.isFinite(goal.monthlyContribution) && goal.monthlyContribution >= 0
);
assert.ok(!Number.isNaN(new Date(goal.targetDate).getTime()));
}

console.log(`PASS: ${goals.length} goals validated.`);

let transactionCount = 0;
const transactionProfileIds = new Set();

for (const group of transactionGroups) {
assert.ok(profileIds.has(group.demoId), `Unknown transaction profile: ${group.demoId}`);
assert.ok(Array.isArray(group.transactions), `${group.demoId}: transactions must be an array`);


transactionProfileIds.add(group.demoId);

for (const transaction of group.transactions) {
  transactionCount++;

  assert.ok(transaction.description?.trim(), "Transaction description is required");
  assert.ok(Number.isFinite(transaction.amount) && transaction.amount > 0);
  assert.ok(
    ["income", "expense"].includes(transaction.type),
    `Invalid transaction type: ${transaction.type}`
  );
  assert.ok(transaction.category, "Transaction category is required");

  if (transaction.frequency !== undefined) {
    assert.ok(
      ["monthly", "once"].includes(transaction.frequency),
      `Unsupported frequency: ${transaction.frequency}`
    );
  }
}


}

for (const profile of profiles) {
assert.ok(
transactionProfileIds.has(profile.demoId),
`${profile.demoId} has no transaction group`
);
}

console.log(`PASS: ${transactionCount} transaction templates validated.`);
console.log("PASS: Every profile has a transaction group.");

console.log("\nALL TESTS PASSED\n");
}

runTests().catch((error) => {
console.error("\nTEST FAILED:", error.message);
process.exitCode = 1;
});
