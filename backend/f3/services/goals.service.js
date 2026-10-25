import { getF3Collection } from "../models/collections.js";
import {
validateObjectId,
validateRequiredString,
validateNumber,
validateDate,
validatePriority
} from "../utils/validation.js";
import { badRequest, notFound } from "../utils/errors.js";

const GOAL_CATEGORIES = [
"emergency_fund",
"education",
"home",
"vehicle",
"retirement",
"travel",
"debt_repayment",
"investment",
"general"
];

function normalizeGoal(input = {}, profileId) {
if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Goal data must be a JSON object.");
}

const name = validateRequiredString(input.name, "name", 150);

const targetAmount = validateNumber(
input.targetAmount,
"targetAmount",
{ min: 0.01 }
);

const currentAmount = validateNumber(
input.currentAmount ?? 0,
"currentAmount"
);

const monthlyContribution = validateNumber(
input.monthlyContribution ?? 0,
"monthlyContribution"
);

const category = input.category ?? "general";

if (
typeof category !== "string" ||
!GOAL_CATEGORIES.includes(category)
) {
throw badRequest(
`category must be one of: ${GOAL_CATEGORIES.join(", ")}.`
);
}

const priority = validatePriority(input.priority ?? "medium");

let targetDate = null;

if (input.targetDate !== undefined && input.targetDate !== null && input.targetDate !== "") {
targetDate = validateDate(input.targetDate, "targetDate");
}

if (currentAmount > targetAmount) {
throw badRequest(
"currentAmount cannot exceed targetAmount."
);
}

return {
profileId,
name,
category,
targetAmount,
currentAmount,
monthlyContribution,
targetDate,
priority
};
}

async function ensureProfileExists(profileId) {
const profile = await getF3Collection("profiles").findOne({
_id: profileId
});

if (!profile) {
throw notFound("Financial profile not found.");
}

return profile;
}

async function findGoal(profileId, goalId) {
const goal = await getF3Collection("goals").findOne({
_id: goalId,
profileId
});

if (!goal) {
throw notFound("Goal not found for this financial profile.");
}

return goal;
}

/**

* Create a goal for an existing financial profile.
  */
  export async function createGoal(profileId, input) {
  const profileObjectId = validateObjectId(profileId, "profileId");

await ensureProfileExists(profileObjectId);

const goal = normalizeGoal(input, profileObjectId);
const now = new Date();

const document = {
...goal,
createdAt: now,
updatedAt: now
};

const result = await getF3Collection("goals").insertOne(document);

return {
...document,
_id: result.insertedId,
remainingAmount: Math.max(
0,
document.targetAmount - document.currentAmount
)
};
}

/**

* Retrieve one goal belonging to a profile.
  */
  export async function getGoalById(profileId, goalId) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const goalObjectId = validateObjectId(goalId, "goalId");

return findGoal(profileObjectId, goalObjectId);
}

/**

* List all goals belonging to a profile.
  */
 export async function listGoals(profileId, options = {}) {
try {
const profileObjectId = validateObjectId(profileId, "profileId");


await ensureProfileExists(profileObjectId);

const { priority, category, completed } = options;

const filter = { profileId: profileObjectId };

if (priority !== undefined) {
  filter.priority = validatePriority(priority);
}

if (category !== undefined) {
  if (
    typeof category !== "string" ||
    !GOAL_CATEGORIES.includes(category)
  ) {
    throw badRequest("Invalid goal category.");
  }

  filter.category = category;
}

console.log("[F3 DEBUG] Goal-list filter:", filter);

const goals = await getF3Collection("goals")
  .find(filter)
  .sort({ createdAt: -1 })
  .toArray();

console.log("[F3 DEBUG] Goals returned:", goals.length);

const enrichedGoals = goals.map((goal) => {
  const remainingAmount = Math.max(
    0,
    goal.targetAmount - goal.currentAmount
  );

  return {
    ...goal,
    remainingAmount,
    progressPercentage:
      goal.targetAmount > 0
        ? Math.min(
            100,
            Number(
              ((goal.currentAmount / goal.targetAmount) * 100).toFixed(2)
            )
          )
        : 0,
    isCompleted: remainingAmount === 0,
  };
});

const filteredGoals =
  completed === undefined
    ? enrichedGoals
    : enrichedGoals.filter(
        (goal) =>
          goal.isCompleted ===
          (completed === true || completed === "true")
      );

const totalTargetAmount = filteredGoals.reduce(
  (sum, goal) => sum + goal.targetAmount,
  0
);

const totalSavedAmount = filteredGoals.reduce(
  (sum, goal) => sum + goal.currentAmount,
  0
);

return {
  goals: filteredGoals,
  summary: {
    totalGoals: filteredGoals.length,
    completedGoals: filteredGoals.filter(
      (goal) => goal.isCompleted
    ).length,
    totalTargetAmount,
    totalSavedAmount,
    totalRemainingAmount: Math.max(
      0,
      totalTargetAmount - totalSavedAmount
    ),
  },
};


} catch (error) {
console.error("[F3 DEBUG] listGoals failed:", error);
throw error;
}
}


/**

* Update a goal while preserving fields not supplied by the caller.
  */
  export async function updateGoal(profileId, goalId, input) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const goalObjectId = validateObjectId(goalId, "goalId");

if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Goal updates must be a JSON object.");
}

const collection = getF3Collection("goals");
const existing = await findGoal(profileObjectId, goalObjectId);

const allowedFields = [
"name",
"category",
"targetAmount",
"currentAmount",
"monthlyContribution",
"targetDate",
"priority"
];

const updates = {};

for (const field of allowedFields) {
if (Object.prototype.hasOwnProperty.call(input, field)) {
updates[field] = input[field];
}
}

if (Object.keys(updates).length === 0) {
throw badRequest("No recognized goal fields were provided.");
}

const normalized = normalizeGoal(
{
...existing,
...updates
},
profileObjectId
);

await collection.updateOne(
{
_id: goalObjectId,
profileId: profileObjectId
},
{
$set: {
...normalized,
updatedAt: new Date()
}
}
);

const updatedGoal = await findGoal(profileObjectId, goalObjectId);

return {
...updatedGoal,
remainingAmount: Math.max(
0,
updatedGoal.targetAmount - updatedGoal.currentAmount
)
};
}

/**

* Delete a goal belonging to a profile.
  */
  export async function deleteGoal(profileId, goalId) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const goalObjectId = validateObjectId(goalId, "goalId");

await findGoal(profileObjectId, goalObjectId);

await getF3Collection("goals").deleteOne({
_id: goalObjectId,
profileId: profileObjectId
});

return {
success: true,
message: "Financial goal deleted successfully."
};
}
