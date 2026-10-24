import { Router } from "express";

import {
  preparePlannerData,
  createProfile,
  getProfile,
  updateProfile,
  listSnapshots,
  getSnapshot
} from "./planner.service.js";

const router = Router();

/**
 * POST /validate
 * Validate planner inputs without saving them.
 */
router.post("/validate", (req, res) => {
  try {
    const result = preparePlannerData(req.body);

    return res.status(200).json({
      success: true,
      message: "Planner inputs are valid.",
      data: {
        validation: result.validation,
        metrics: result.metrics
      }
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.details ?? []
      });
    }

    console.error("Planner validation error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to validate planner inputs."
    });
  }
});

/**
 * POST /
 * Create a financial profile and its initial snapshot.
 */
router.post("/", async (req, res) => {
  try {
    const result = await createProfile(req.body);

    return res.status(201).json({
      success: true,
      message: "Financial profile created successfully.",
      data: result
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.details ?? []
      });
    }

    console.error("Create profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to create financial profile."
    });
  }
});

/**
 * GET /:profileId
 * Retrieve a financial profile.
 */
router.get("/:profileId", async (req, res) => {
  try {
    const profile = await getProfile(req.params.profileId);

    return res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    const status = error.statusCode ?? 500;

    if (status === 500) {
      console.error("Get profile error:", error.message);
    }

    return res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Failed to retrieve financial profile."
          : error.message
    });
  }
});

/**
 * PUT /:profileId
 * Update profile inputs and create a new snapshot.
 */
router.put("/:profileId", async (req, res) => {
  try {
    const result = await updateProfile(
      req.params.profileId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Financial profile updated successfully.",
      data: result
    });
  } catch (error) {
    const status = error.statusCode ?? 500;

    if (status === 500) {
      console.error("Update profile error:", error.message);
    }

    return res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Failed to update financial profile."
          : error.message,
      errors: error.details ?? []
    });
  }
});

/**
 * GET /:profileId/snapshots
 * List snapshot history.
 */
router.get("/:profileId/snapshots", async (req, res) => {
  try {
    const snapshots = await listSnapshots(req.params.profileId);

    return res.status(200).json({
      success: true,
      count: snapshots.length,
      data: snapshots
    });
  } catch (error) {
    const status = error.statusCode ?? 500;

    if (status === 500) {
      console.error("List snapshots error:", error.message);
    }

    return res.status(status).json({
      success: false,
      message:
        status === 500
          ? "Failed to retrieve snapshot history."
          : error.message
    });
  }
});

/**
 * GET /:profileId/snapshots/:snapshotId
 * Retrieve one historical snapshot.
 */
router.get(
  "/:profileId/snapshots/:snapshotId",
  async (req, res) => {
    try {
      const snapshot = await getSnapshot(
        req.params.profileId,
        req.params.snapshotId
      );

      return res.status(200).json({
        success: true,
        data: snapshot
      });
    } catch (error) {
      const status = error.statusCode ?? 500;

      if (status === 500) {
        console.error("Get snapshot error:", error.message);
      }

      return res.status(status).json({
        success: false,
        message:
          status === 500
            ? "Failed to retrieve snapshot."
            : error.message
      });
    }
  }
);

export default router;

