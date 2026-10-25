import { getDB } from "../../db/connection.js";

export const F3_COLLECTIONS = Object.freeze({
profiles: "f3_profiles",
goals: "f3_goals",
transactions: "f3_transactions",
analyses: "f3_analyses"
});

/**

* Returns the existing MongoDB database connection.
* The main backend is responsible for connecting to MongoDB.
  */
  export function getF3Database() {
  return getDB();
  }

/**

* Returns the MongoDB collection used by an F3 feature.
*
* Example:
* getF3Collection("profiles")
  */
  export function getF3Collection(name) {
  const collectionName = F3_COLLECTIONS[name];

if (!collectionName) {
throw new Error(`Unknown F3 collection: ${name}`);
}

return getF3Database().collection(collectionName);
}
