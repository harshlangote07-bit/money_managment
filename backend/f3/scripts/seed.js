import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, closeDB } from "../../db/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

const COLLECTIONS = {
profiles: "f3_profiles",
goals: "f3_goals",
transactions: "f3_transactions",
analyses: "f3_analyses",
};

const MONTHS = [
{ year: 2026, month: 6 }, // July
{ year: 2026, month: 7 }, // August
{ year: 2026, month: 8 }, // September
{ year: 2026, month: 9 }, // October
];

async function readJson(filename) {
const filePath = path.join(DATA_DIR, filename);
const content = await readFile(filePath, "utf8");
return JSON.parse(content);
}

function assertArray(value, filename) {
if (!Array.isArray(value)) {
throw new Error(`${filename} must contain a JSON array.`);
}

return value;
}

function assertUniqueDemoIds(profiles) {
const seen = new Set();

for (const profile of profiles) {
if (!profile.demoId || typeof profile.demoId !== "string") {
throw new Error("Every demo profile must have a string demoId.");
}


if (seen.has(profile.demoId)) {
  throw new Error(`Duplicate demo profile ID: ${profile.demoId}`);
}

seen.add(profile.demoId);


}

return seen;
}

function validateReferences(items, validProfileIds, filename) {
for (const item of items) {
if (!validProfileIds.has(item.demoId)) {
throw new Error(
`${filename} references unknown profile ID: ${item.demoId}`
);
}
}
}

function normalizeProfile(profile, now) {
const {
demoId,
scenario,
name,
currency = "INR",
monthlyIncome,
essentialExpenses,
discretionaryExpenses,
monthlyDebtPayments = 0,
monthlyCommitments = 0,
savings = 0,
outstandingDebt = 0,
} = profile;

const numericFields = {
monthlyIncome,
essentialExpenses,
discretionaryExpenses,
monthlyDebtPayments,
monthlyCommitments,
savings,
outstandingDebt,
};

for (const [field, value] of Object.entries(numericFields)) {
if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
throw new Error(
`Invalid ${field} in demo profile ${demoId}: expected a non-negative number.`
);
}
}

if (typeof name !== "string" || !name.trim()) {
throw new Error(`Demo profile ${demoId} has no valid name.`);
}

return {
demoId,
demo: true,
scenario: scenario ?? "Synthetic demonstration profile",
name: name.trim(),
currency,
monthlyIncome,
essentialExpenses,
discretionaryExpenses,
monthlyDebtPayments,
monthlyCommitments,
savings,
outstandingDebt,
createdAt: now,
updatedAt: now,
};
}

function normalizeGoal(goal, profileId, now) {
const targetAmount = Number(goal.targetAmount);
const currentAmount = Number(goal.currentAmount ?? 0);
const monthlyContribution = Number(goal.monthlyContribution ?? 0);

if (
!Number.isFinite(targetAmount) ||
targetAmount <= 0 ||
!Number.isFinite(currentAmount) ||
currentAmount < 0 ||
currentAmount > targetAmount ||
!Number.isFinite(monthlyContribution) ||
monthlyContribution < 0
) {
throw new Error(`Invalid goal amounts for "${goal.name}".`);
}

if (!goal.name || !goal.category || !goal.targetDate) {
throw new Error(`Goal "${goal.name ?? "(unnamed)"}" is missing required fields.`);
}

const targetDate = new Date(goal.targetDate);

if (Number.isNaN(targetDate.getTime())) {
throw new Error(`Invalid targetDate for goal "${goal.name}".`);
}

return {
profileId,
demoId: goal.demoId,
demo: true,
name: goal.name.trim(),
category: goal.category,
targetAmount,
currentAmount,
monthlyContribution,
targetDate,
priority: goal.priority ?? "medium",
createdAt: now,
updatedAt: now,
};
}

function normalizeTransaction(template, profileId, demoId, month, now) {
const day = Number(template.day);
const amount = Number(template.amount);

if (!Number.isInteger(day) || day < 1 || day > 31) {
throw new Error(
`Invalid transaction day for ${demoId}: ${template.day}`
);
}

if (!Number.isFinite(amount) || amount <= 0) {
throw new Error(
`Invalid transaction amount for ${demoId}: ${template.amount}`
);
}

if (!["income", "expense"].includes(template.type)) {
throw new Error(
`Invalid transaction type for ${demoId}: ${template.type}`
);
}

if (!template.description || !template.category) {
throw new Error(
`Transaction for ${demoId} needs a description and category.`
);
}

const lastDayOfMonth = new Date(
Date.UTC(month.year, month.month + 1, 0)
).getUTCDate();

if (day > lastDayOfMonth) {
throw new Error(
`Transaction day ${day} does not exist in ${month.month + 1}/${month.year}.`
);
}

// Keep dates deterministic and avoid timezone shifts.
const date = new Date(
Date.UTC(month.year, month.month, day, 12, 0, 0)
);

// Apply small deterministic expense variations across months.
// Income remains unchanged.
const monthMultipliers = [0.96, 1.0, 1.04, 1.08];
const multiplier = monthMultipliers[month.month - 6] ?? 1;
const adjustedAmount =
template.type === "expense"
? Math.round(amount * multiplier * 100) / 100
: amount;

return {
profileId,
demoId,
demo: true,
date,
description: template.description.trim(),
amount: adjustedAmount,
type: template.type,
category: template.category,
final_category: template.category,
merchant: template.merchant ?? null,
source: "demo_seed",
createdAt: now,
updatedAt: now,
};
}

async function main() {
console.log("Starting F3 demo-data seeding...");

const profilesInput = assertArray(
await readJson("demo-profile.json"),
"demo-profile.json"
);

const goalsInput = assertArray(
await readJson("demo-goals.json"),
"demo-goals.json"
);

const transactionGroups = assertArray(
await readJson("demo-transactions.json"),
"demo-transactions.json"
);

const validProfileIds = assertUniqueDemoIds(profilesInput);

validateReferences(goalsInput, validProfileIds, "demo-goals.json");
validateReferences(
transactionGroups,
validProfileIds,
"demo-transactions.json"
);

for (const group of transactionGroups) {
if (!Array.isArray(group.transactions)) {
throw new Error(
`Transactions for ${group.demoId} must be an array.`
);
}
}

await connectDB();

const { getDB } = await import("../../db/connection.js");
const db = getDB();

const profilesCollection = db.collection(COLLECTIONS.profiles);
const goalsCollection = db.collection(COLLECTIONS.goals);
const transactionsCollection = db.collection(COLLECTIONS.transactions);
const analysesCollection = db.collection(COLLECTIONS.analyses);

try {
// Indexes support profile lookup and chronological history.
await profilesCollection.createIndex(
{ demoId: 1 },
{ unique: true, sparse: true }
);
await goalsCollection.createIndex({ profileId: 1, createdAt: -1 });
await transactionsCollection.createIndex({ profileId: 1, date: -1 });
await analysesCollection.createIndex({ profileId: 1, createdAt: -1 });


// Remove only records explicitly marked as F3 demo data.
// Do not delete user-created records or data belonging to other modules.
console.log("Removing previous F3 demo records...");

await goalsCollection.deleteMany({ demo: true });
await transactionsCollection.deleteMany({ demo: true });
await analysesCollection.deleteMany({ demo: true });
await profilesCollection.deleteMany({ demo: true });

const now = new Date();

const profiles = profilesInput.map((profile) =>
  normalizeProfile(profile, now)
);

const profileResult = await profilesCollection.insertMany(profiles);
const profileIds = new Map();

profiles.forEach((profile, index) => {
  const insertedId = profileResult.insertedIds[index];
  profileIds.set(profile.demoId, insertedId);
});

const goals = goalsInput.map((goal) => {
  const profileId = profileIds.get(goal.demoId);

  if (!profileId) {
    throw new Error(`Could not find profile for goal: ${goal.demoId}`);
  }

  return normalizeGoal(goal, profileId, now);
});

const transactionDocuments = [];

for (const group of transactionGroups) {
  const profileId = profileIds.get(group.demoId);

  if (!profileId) {
    throw new Error(
      `Could not find profile for transactions: ${group.demoId}`
    );
  }

  for (const template of group.transactions) {
    const frequency = template.frequency ?? "monthly";

    if (frequency === "monthly") {
      for (const month of MONTHS) {
        transactionDocuments.push(
          normalizeTransaction(
            template,
            profileId,
            group.demoId,
            month,
            now
          )
        );
      }
    } else if (frequency === "once") {
      // A one-time transaction is assigned to the specified month,
      // or October 2026 if no month is supplied.
      const monthNumber = Number(template.month ?? 10);

      if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
        throw new Error(
          `Invalid one-time transaction month for ${group.demoId}.`
        );
      }

      transactionDocuments.push(
        normalizeTransaction(
          template,
          profileId,
          group.demoId,
          { year: Number(template.year ?? 2026), month: monthNumber - 1 },
          now
        )
      );
    } else {
      throw new Error(
        `Unsupported frequency "${frequency}" for ${group.demoId}. Use "monthly" or "once".`
      );
    }
  }
}

if (goals.length > 0) {
  await goalsCollection.insertMany(goals);
}

if (transactionDocuments.length > 0) {
  await transactionsCollection.insertMany(transactionDocuments);
}

console.log("\nF3 demo data seeded successfully.");
console.log(`Profiles:     ${profiles.length}`);
console.log(`Goals:        ${goals.length}`);
console.log(`Transactions: ${transactionDocuments.length}`);
console.log("\nDemo profile IDs:");

for (const [demoId, objectId] of profileIds.entries()) {
  console.log(`  ${demoId}: ${objectId.toString()}`);
}

} finally {
await closeDB();
}
}

main().catch((error) => {
console.error("\nF3 demo-data seeding failed:");
console.error(error.message);
process.exitCode = 1;
});
