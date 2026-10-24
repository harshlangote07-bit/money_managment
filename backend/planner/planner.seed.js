import "dotenv/config";
import { randomUUID } from "node:crypto";
import { connectDB, closeDB } from "../db/connection.js";
import { plannerTestCases } from "./planner.testdata.js";

const FIXTURE_COLLECTION = "planner_test_fixtures";

const testRunId = randomUUID();
let db;

try {
  db = await connectDB();

  const fixtures = plannerTestCases.map((testCase) => ({
    test_run_id: testRunId,
    test_id: testCase.test_id,
    name: testCase.name,
    expected_valid: testCase.expected_valid,
    input: testCase.input,
    fixture_type: "F2_PLANNER_TEST",
    created_at: new Date()
  }));

  const result = await db
    .collection(FIXTURE_COLLECTION)
    .insertMany(fixtures, { ordered: true });

  console.log("\nF2 planner test data seeded successfully.");
  console.log(`Test run ID: ${testRunId}`);
  console.log(`Inserted documents: ${result.insertedCount}`);
  console.log(`Collection: ${FIXTURE_COLLECTION}`);

  console.log("\nSeeded fixtures:");

  for (const fixture of fixtures) {
    console.log(
      `${fixture.test_id} | ${fixture.name} | ` +
      `Expected valid: ${fixture.expected_valid}`
    );
  }

  console.log(
    "\nKeep the test run ID above to identify this batch later."
  );
} catch (error) {
  console.error("F2 test-data seeding failed:", error.message);
  process.exitCode = 1;
} finally {
  await closeDB().catch((error) => {
    console.error("Failed to close MongoDB connection:", error.message);
    process.exitCode = 1;
  });
}

