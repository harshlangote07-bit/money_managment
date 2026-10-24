import { ObjectId } from "mongodb";
import { getDB } from "../db/connection.js";
import { validatePlannerInput } from "./planner.validation.js";
import { PLANNER_VERSION } from "./planner.constants.js";

const PROFILES = "financial_profiles";
const SNAPSHOTS = "budget_snapshots";

/**
 * Calculate derived financial metrics.
 * These are calculated by the backend, not supplied by the user.
 */
function calculateFinancialMetrics(input) {
  const totalMonthlyIncome =
    input.monthly_income + input.other_monthly_income;

  const totalMonthlyExpenses =
    input.essential_expenses +
    input.discretionary_expenses +
    input.monthly_emi +
    input.monthly_recurring_commitments;

  const monthlySurplus = totalMonthlyIncome - totalMonthlyExpenses;

  const monthlySavingsRate =
    totalMonthlyIncome > 0
      ? Number(((monthlySurplus / totalMonthlyIncome) * 100).toFixed(2))
      : null;

  const debtToIncomeRatio =
    totalMonthlyIncome > 0
      ? Number(((input.monthly_emi / totalMonthlyIncome) * 100).toFixed(2))
      : null;

  const monthlyLivingExpenses =
    input.essential_expenses + input.discretionary_expenses;

  const emergencyFundCoverageMonths =
    monthlyLivingExpenses > 0
      ? Number((input.current_savings / monthlyLivingExpenses).toFixed(2))
      : null;

  return {
    total_monthly_income: totalMonthlyIncome,
    total_monthly_expenses: totalMonthlyExpenses,
    monthly_surplus: monthlySurplus,
    monthly_savings_rate: monthlySavingsRate,
    debt_to_income_ratio: debtToIncomeRatio,
    emergency_fund_coverage_months: emergencyFundCoverageMonths
  };
}

/**
 * Validate profile data and return calculated metrics.
 */
export function preparePlannerData(input) {
  const validation = validatePlannerInput(input);

  if (!validation.valid) {
    const error = new Error("Planner input validation failed.");
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  return {
    validation,
    metrics: calculateFinancialMetrics(input)
  };
}

/**
 * Save an immutable snapshot of a financial profile.
 */
async function createSnapshot(db, profile) {
  const snapshots = db.collection(SNAPSHOTS);

  const latestSnapshot = await snapshots
    .find({ profile_id: profile._id })
    .sort({ version: -1 })
    .limit(1)
    .next();

  const version = (latestSnapshot?.version ?? 0) + 1;

  const snapshot = {
    profile_id: profile._id,
    version,
    planner_version: PLANNER_VERSION,
    input: structuredClone(profile.input),
    metrics: structuredClone(profile.metrics),
    warnings: [...profile.warnings],
    created_at: new Date()
  };

  const result = await snapshots.insertOne(snapshot);

  return {
    ...snapshot,
    _id: result.insertedId
  };
}

/**
 * Create a new financial profile and its first snapshot.
 */
export async function createProfile(input) {
  const db = getDB();
  const { validation, metrics } = preparePlannerData(input);

  const now = new Date();

  const profile = {
    input: structuredClone(input),
    metrics,
    warnings: validation.warnings,
    schema_version: PLANNER_VERSION,
    current_snapshot_version: 1,
    created_at: now,
    updated_at: now
  };

  const result = await db.collection(PROFILES).insertOne(profile);

  profile._id = result.insertedId;

  try {
    const snapshot = await createSnapshot(db, profile);

    await db.collection(PROFILES).updateOne(
      { _id: profile._id },
      {
        $set: {
          current_snapshot_version: snapshot.version
        }
      }
    );

    profile.current_snapshot_version = snapshot.version;

    return {
      profile,
      snapshot
    };
  } catch (error) {
    // Avoid leaving a profile behind if initial snapshot creation fails.
    await db.collection(PROFILES).deleteOne({ _id: profile._id });
    throw error;
  }
}

/**
 * Retrieve a profile by its MongoDB ObjectId.
 */
export async function getProfile(profileId) {
  if (!ObjectId.isValid(profileId)) {
    const error = new Error("Invalid profile ID.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDB();

  const profile = await db.collection(PROFILES).findOne({
    _id: new ObjectId(profileId)
  });

  if (!profile) {
    const error = new Error("Financial profile not found.");
    error.statusCode = 404;
    throw error;
  }

  return profile;
}

/**
 * Update a profile and preserve the previous snapshot.
 *
 * Every successful update creates a new snapshot.
 */
export async function updateProfile(profileId, input) {
  if (!ObjectId.isValid(profileId)) {
    const error = new Error("Invalid profile ID.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDB();
  const { validation, metrics } = preparePlannerData(input);

  const _id = new ObjectId(profileId);
  const profiles = db.collection(PROFILES);

  const existingProfile = await profiles.findOne({ _id });

  if (!existingProfile) {
    const error = new Error("Financial profile not found.");
    error.statusCode = 404;
    throw error;
  }

  const updatedProfile = {
    input: structuredClone(input),
    metrics,
    warnings: validation.warnings,
    schema_version: PLANNER_VERSION,
    updated_at: new Date()
  };

  const result = await profiles.updateOne(
    { _id },
    {
      $set: updatedProfile,
      $inc: {
        current_snapshot_version: 1
      }
    }
  );

  if (result.matchedCount !== 1) {
    const error = new Error("Profile could not be updated.");
    error.statusCode = 500;
    throw error;
  }

  const savedProfile = await profiles.findOne({ _id });

  const snapshot = await createSnapshot(db, savedProfile);

  return {
    profile: savedProfile,
    snapshot
  };
}

/**
 * List snapshots belonging to one profile.
 */
export async function listSnapshots(profileId) {
  if (!ObjectId.isValid(profileId)) {
    const error = new Error("Invalid profile ID.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDB();
  const _id = new ObjectId(profileId);

  const profileExists = await db.collection(PROFILES).findOne(
    { _id },
    { projection: { _id: 1 } }
  );

  if (!profileExists) {
    const error = new Error("Financial profile not found.");
    error.statusCode = 404;
    throw error;
  }

  return db.collection(SNAPSHOTS)
    .find(
      { profile_id: _id },
      {
        projection: {
          profile_id: 1,
          version: 1,
          planner_version: 1,
          created_at: 1
        }
      }
    )
    .sort({ version: -1 })
    .toArray();
}

/**
 * Retrieve a specific historical snapshot.
 */
export async function getSnapshot(profileId, snapshotId) {
  if (!ObjectId.isValid(profileId) || !ObjectId.isValid(snapshotId)) {
    const error = new Error("Invalid profile ID or snapshot ID.");
    error.statusCode = 400;
    throw error;
  }

  const db = getDB();

  const snapshot = await db.collection(SNAPSHOTS).findOne({
    _id: new ObjectId(snapshotId),
    profile_id: new ObjectId(profileId)
  });

  if (!snapshot) {
    const error = new Error("Snapshot not found.");
    error.statusCode = 404;
    throw error;
  }

  return snapshot;
}