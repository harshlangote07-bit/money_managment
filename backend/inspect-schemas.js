import "dotenv/config";
import { connectDB, closeDB } from "./db/connection.js";

const collectionsToInspect = [
  "financial_profiles",
  "budget_snapshots",
  "income_sources",
  "accounts",
  "liabilities",
  "goals",
  "recurring_commitments",
  "users",
  "audit_logs"
];

try {
  const db = await connectDB();

  for (const collectionName of collectionsToInspect) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`COLLECTION: ${collectionName}`);
    console.log("=".repeat(60));

    const collection = db.collection(collectionName);

    const count = await collection.countDocuments();

    console.log(`Document count: ${count}`);

    const sample = await collection.findOne();

    if (sample) {
      console.log("Sample document:");

      // Display field names and value types without exposing values.
      const structure = {};

      for (const [key, value] of Object.entries(sample)) {
        if (value === null) {
          structure[key] = "null";
        } else if (value instanceof Date) {
          structure[key] = "Date";
        } else if (Array.isArray(value)) {
          structure[key] = "Array";
        } else if (value?._bsontype === "ObjectId") {
          structure[key] = "ObjectId";
        } else {
          structure[key] = typeof value;
        }
      }

      console.log(JSON.stringify(structure, null, 2));
    } else {
      console.log("Collection is empty.");
    }
  }
} catch (error) {
  console.error("Schema inspection failed:", error.message);
  process.exitCode = 1;
} finally {
  await closeDB();
}