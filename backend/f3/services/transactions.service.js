import { getF3Collection } from "../models/collections.js";
import {
validateObjectId,
validateRequiredString,
validateNumber,
validateDate,
validateEnum,
validateArray
} from "../utils/validation.js";
import { badRequest, notFound } from "../utils/errors.js";

const TRANSACTION_TYPES = ["income", "expense"];

const MAX_BULK_TRANSACTIONS = 1000;

function normalizeTransaction(input, profileId) {
if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Transaction data must be a JSON object.");
}

const amount = validateNumber(input.amount, "amount", {
min: 0.01
});

const description = validateRequiredString(
input.description,
"description",
500
);

const type = validateEnum(
String(input.type || "").toLowerCase(),
TRANSACTION_TYPES,
"type"
);

const date = validateDate(input.date, "date");

const category = validateRequiredString(
input.category || "uncategorized",
"category",
100
);

const merchant =
input.merchant === undefined || input.merchant === null
? null
: validateRequiredString(input.merchant, "merchant", 200);

return {
profileId,
date,
description,
amount,
type,
category,
final_category: category,
merchant,
source: String(input.source || "manual"),
createdAt: new Date(),
updatedAt: new Date()
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

/**

* Create one transaction for a financial profile.
  */
  export async function createTransaction(profileId, input) {
  const profileObjectId = validateObjectId(profileId, "profileId");

await ensureProfileExists(profileObjectId);

const transaction = normalizeTransaction(
input,
profileObjectId
);

const result = await getF3Collection("transactions").insertOne(
transaction
);

return {
...transaction,
_id: result.insertedId
};
}

/**

* Import multiple transactions in one request.
*
* All rows are validated before any insert is attempted.
  */
  export async function createTransactionsBulk(profileId, inputRows) {
  const profileObjectId = validateObjectId(profileId, "profileId");

await ensureProfileExists(profileObjectId);

const rows = validateArray(inputRows, "transactions", {
minLength: 1,
maxLength: MAX_BULK_TRANSACTIONS
});

const transactions = rows.map((row) =>
normalizeTransaction(row, profileObjectId)
);

const result = await getF3Collection("transactions").insertMany(
transactions,
{ ordered: true }
);

return {
insertedCount: result.insertedCount,
transactionIds: Object.values(result.insertedIds)
};
}

/**

* Retrieve a transaction belonging to a specific profile.
  */
  export async function getTransactionById(profileId, transactionId) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const transactionObjectId = validateObjectId(
  transactionId,
  "transactionId"
  );

const transaction = await getF3Collection("transactions").findOne({
_id: transactionObjectId,
profileId: profileObjectId
});

if (!transaction) {
throw notFound("Transaction not found for this profile.");
}

return transaction;
}

/**

* List transactions with optional filters and pagination.
*
* Supported filters:
* * type: income | expense
* * category: exact category
* * startDate: inclusive lower date boundary
* * endDate: inclusive upper date boundary
* * limit: maximum number of returned records
* * skip: pagination offset
    */
    export async function listTransactions(profileId, options = {}) {
    const profileObjectId = validateObjectId(profileId, "profileId");

await ensureProfileExists(profileObjectId);

const {
type,
category,
startDate,
endDate,
limit = 100,
skip = 0
} = options;

const parsedLimit = Number(limit);
const parsedSkip = Number(skip);

if (
!Number.isInteger(parsedLimit) ||
parsedLimit < 1 ||
parsedLimit > 500
) {
throw badRequest("limit must be an integer between 1 and 500.");
}

if (!Number.isInteger(parsedSkip) || parsedSkip < 0) {
throw badRequest("skip must be a non-negative integer.");
}

const filter = {
profileId: profileObjectId
};

if (type !== undefined) {
filter.type = validateEnum(
String(type).toLowerCase(),
TRANSACTION_TYPES,
"type"
);
}

if (category !== undefined) {
filter.category = validateRequiredString(
category,
"category",
100
);
}

if (startDate !== undefined || endDate !== undefined) {
filter.date = {};


if (startDate !== undefined) {
  filter.date.$gte = validateDate(startDate, "startDate");
}

if (endDate !== undefined) {
  const end = validateDate(endDate, "endDate");

  // Include the entire end date when a date-only value is provided.
  if (
    typeof endDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    end.setHours(23, 59, 59, 999);
  }

  filter.date.$lte = end;
}

if (
  filter.date.$gte &&
  filter.date.$lte &&
  filter.date.$gte > filter.date.$lte
) {
  throw badRequest("startDate cannot be after endDate.");
}


}

const collection = getF3Collection("transactions");

try {
  console.log("[F3 DEBUG] Transaction filter:", filter);
  console.log("[F3 DEBUG] Transaction pagination:", {
    limit: parsedLimit,
    skip: parsedSkip
  });

  const [transactions, total] = await Promise.all([
    collection
      .find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(parsedSkip)
      .limit(parsedLimit)
      .toArray(),
    collection.countDocuments(filter)
  ]);

  console.log("[F3 DEBUG] Transactions returned:", transactions.length);
  console.log("[F3 DEBUG] Transaction count:", total);

  return {
    transactions,
    pagination: {
      total,
      limit: parsedLimit,
      skip: parsedSkip,
      hasMore: parsedSkip + transactions.length < total
    }
  };
} catch (error) {
  console.error("[F3 DEBUG] listTransactions failed:", error);
  throw error;
}

}

/**

* Update an existing transaction belonging to a profile.
  */
  export async function updateTransaction(
  profileId,
  transactionId,
  input
  ) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const transactionObjectId = validateObjectId(
  transactionId,
  "transactionId"
  );

if (!input || typeof input !== "object" || Array.isArray(input)) {
throw badRequest("Transaction updates must be a JSON object.");
}

const collection = getF3Collection("transactions");

const existing = await collection.findOne({
_id: transactionObjectId,
profileId: profileObjectId
});

if (!existing) {
throw notFound("Transaction not found for this profile.");
}

const allowedFields = [
"date",
"description",
"amount",
"type",
"category",
"merchant"
];

const updates = {};

for (const field of allowedFields) {
if (Object.prototype.hasOwnProperty.call(input, field)) {
updates[field] = input[field];
}
}

if (Object.keys(updates).length === 0) {
throw badRequest(
"No recognized transaction fields were provided."
);
}

const normalized = normalizeTransaction(
{
...existing,
...updates
},
profileObjectId
);

// Preserve the original creation timestamp.
delete normalized.createdAt;

await collection.updateOne(
{
_id: transactionObjectId,
profileId: profileObjectId
},
{
$set: {
...normalized,
updatedAt: new Date()
}
}
);

return collection.findOne({
_id: transactionObjectId,
profileId: profileObjectId
});
}

/**

* Delete a transaction belonging to a profile.
  */
  export async function deleteTransaction(profileId, transactionId) {
  const profileObjectId = validateObjectId(profileId, "profileId");
  const transactionObjectId = validateObjectId(
  transactionId,
  "transactionId"
  );

const result = await getF3Collection("transactions").deleteOne({
_id: transactionObjectId,
profileId: profileObjectId
});

if (result.deletedCount === 0) {
throw notFound("Transaction not found for this profile.");
}

return {
success: true,
message: "Transaction deleted successfully."
};
}

/**

* Calculate income and expense totals for a profile.
  */
  export async function getTransactionSummary(
  profileId,
  options = {}
  ) {
  const profileObjectId = validateObjectId(profileId, "profileId");

await ensureProfileExists(profileObjectId);

const { startDate, endDate } = options;

const match = {
profileId: profileObjectId
};

if (startDate !== undefined || endDate !== undefined) {
match.date = {};


if (startDate !== undefined) {
  match.date.$gte = validateDate(startDate, "startDate");
}

if (endDate !== undefined) {
  const end = validateDate(endDate, "endDate");

  if (
    typeof endDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    end.setHours(23, 59, 59, 999);
  }

  match.date.$lte = end;
}

if (
  match.date.$gte &&
  match.date.$lte &&
  match.date.$gte > match.date.$lte
) {
  throw badRequest("startDate cannot be after endDate.");
}


}

const result = await getF3Collection("transactions")
.aggregate([
{ $match: match },
{
$group: {
_id: "$type",
totalAmount: { $sum: "$amount" },
transactionCount: { $sum: 1 }
}
}
])
.toArray();

const summary = {
totalIncome: 0,
totalExpenses: 0,
incomeTransactions: 0,
expenseTransactions: 0,
netCashFlow: 0
};

for (const item of result) {
if (item._id === "income") {
summary.totalIncome = item.totalAmount;
summary.incomeTransactions = item.transactionCount;
}


if (item._id === "expense") {
  summary.totalExpenses = item.totalAmount;
  summary.expenseTransactions = item.transactionCount;
}


}

summary.netCashFlow =
summary.totalIncome - summary.totalExpenses;

return summary;
}
