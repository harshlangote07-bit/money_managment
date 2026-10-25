import { ObjectId } from "mongodb";
import { getF3Collection } from "../models/collections.js";
import {
validateObjectId,
validateRequiredString,
validateNumber,
validateCurrency
} from "../utils/validation.js";
import { badRequest, notFound } from "../utils/errors.js";

const PROFILE_FIELDS = [
"name",
"currency",
"monthlyIncome",
"essentialExpenses",
"discretionaryExpenses",
"monthlyDebtPayments",
"monthlyCommitments",
"savings",
"outstandingDebt"
];

function normalizeProfile(input = {}) {
if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Profile data must be a JSON object.");
}

const profile = {
name: validateRequiredString(input.name, "name", 100),
currency: validateCurrency(input.currency || "INR"),
monthlyIncome: validateNumber(
input.monthlyIncome,
"monthlyIncome"
),
essentialExpenses: validateNumber(
input.essentialExpenses,
"essentialExpenses"
),
discretionaryExpenses: validateNumber(
input.discretionaryExpenses,
"discretionaryExpenses"
),
monthlyDebtPayments: validateNumber(
input.monthlyDebtPayments ?? 0,
"monthlyDebtPayments"
),
monthlyCommitments: validateNumber(
input.monthlyCommitments ?? 0,
"monthlyCommitments"
),
savings: validateNumber(input.savings ?? 0, "savings"),
outstandingDebt: validateNumber(
input.outstandingDebt ?? 0,
"outstandingDebt"
)
};

return profile;
}

/**

* Create a new financial profile.
  */
  export async function createProfile(input) {
  const profile = normalizeProfile(input);
  const now = new Date();

const document = {
...profile,
createdAt: now,
updatedAt: now
};

const result = await getF3Collection("profiles").insertOne(document);

return {
...document,
_id: result.insertedId
};
}

/**

* Retrieve a profile by its MongoDB ID.
  */
  export async function getProfileById(profileId) {
  const id = validateObjectId(profileId, "profileId");

const profile = await getF3Collection("profiles").findOne({
_id: id
});

if (!profile) {
throw notFound("Financial profile not found.");
}

return profile;
}

/**

* List financial profiles.
* Results are paginated to avoid returning an unlimited number of records.
  */
  export async function listProfiles({ limit = 20, skip = 0 } = {}) {
  const parsedLimit = Number(limit);
  const parsedSkip = Number(skip);

if (
!Number.isInteger(parsedLimit) ||
parsedLimit < 1 ||
parsedLimit > 100
) {
throw badRequest("limit must be an integer between 1 and 100.");
}

if (!Number.isInteger(parsedSkip) || parsedSkip < 0) {
throw badRequest("skip must be a non-negative integer.");
}

const collection = getF3Collection("profiles");

const [profiles, total] = await Promise.all([
collection
.find({})
.sort({ createdAt: -1 })
.skip(parsedSkip)
.limit(parsedLimit)
.toArray(),


collection.countDocuments({})


]);

return {
profiles,
pagination: {
total,
limit: parsedLimit,
skip: parsedSkip,
hasMore: parsedSkip + profiles.length < total
}
};
}

/**

* Update an existing financial profile.
* Only recognized profile fields can be updated.
  */
  export async function updateProfile(profileId, input) {
  const id = validateObjectId(profileId, "profileId");

if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Profile updates must be a JSON object.");
}

const collection = getF3Collection("profiles");

const existing = await collection.findOne({ _id: id });

if (!existing) {
throw notFound("Financial profile not found.");
}

const updates = {};

for (const field of PROFILE_FIELDS) {
if (Object.prototype.hasOwnProperty.call(input, field)) {
updates[field] = input[field];
}
}

if (Object.keys(updates).length === 0) {
throw badRequest("No recognized profile fields were provided.");
}

// Validate the complete merged profile, not only individual changes.
const mergedProfile = normalizeProfile({
...existing,
...updates
});

await collection.updateOne(
{ _id: id },
{
$set: {
...mergedProfile,
updatedAt: new Date()
}
}
);

return collection.findOne({ _id: id });
}

/**

* Delete a profile and its associated F3 data.
*
* This is a destructive operation. Call it only when deletion is explicitly
* requested by the caller. Associated records are removed to prevent orphans.
  */
  export async function deleteProfile(profileId) {
  const id = validateObjectId(profileId, "profileId");
  const profiles = getF3Collection("profiles");

const existing = await profiles.findOne({ _id: id });

if (!existing) {
throw notFound("Financial profile not found.");
}

const goals = getF3Collection("goals");
const transactions = getF3Collection("transactions");
const analyses = getF3Collection("analyses");

await Promise.all([
goals.deleteMany({ profileId: id }),
transactions.deleteMany({ profileId: id }),
analyses.deleteMany({ profileId: id })
]);

await profiles.deleteOne({ _id: id });

return {
success: true,
message: "Financial profile and associated F3 records deleted."
};
}
