
import "dotenv/config";
import { connectDB, closeDB } from "./db/connection.js";

try {
  const database = await connectDB();

  const collections = await database
    .listCollections({}, { nameOnly: true })
    .toArray();

  console.log("\nCollections in SmartPath:");

  for (const collection of collections) {
    console.log(`- ${collection.name}`);
  }
} catch (error) {
  console.error("Test failed:", error.message);
  process.exitCode = 1;
} finally {
  await closeDB();
}
