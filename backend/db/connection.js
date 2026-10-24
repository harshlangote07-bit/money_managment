
import { MongoClient } from "mongodb";

let client;
let database;

export async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB || "SmartPath";

    if (!uri) {
      throw new Error("MONGODB_URI is missing from the .env file");
    }

    client = new MongoClient(uri);
    await client.connect();

    database = client.db(dbName);
    await database.command({ ping: 1 });

    console.log(`MongoDB connected successfully: ${dbName}`);

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    if (client) {
      await client.close().catch(() => {});
      client = undefined;
    }

    database = undefined;
    throw error;
  }
}

export function getDB() {
  if (!database) {
    throw new Error("Database not connected. Call connectDB() first.");
  }

  return database;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;

    console.log("MongoDB connection closed.");
  }
}
