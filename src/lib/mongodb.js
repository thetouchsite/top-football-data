import { MongoClient } from "mongodb";

const globalForMongo = globalThis;

if (!globalForMongo.__mongoConnection) {
  globalForMongo.__mongoConnection = {
    client: null,
    promise: null,
  };
}

const cachedConnection = globalForMongo.__mongoConnection;

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable.");
  }

  if (cachedConnection.client) {
    return cachedConnection.client;
  }

  if (!cachedConnection.promise) {
    cachedConnection.promise = MongoClient.connect(uri);
  }

  cachedConnection.client = await cachedConnection.promise;
  return cachedConnection.client;
}

export async function getDatabase() {
  const client = await getMongoClient();
  const databaseName = process.env.MONGODB_DB || "top-football-pulse";
  return client.db(databaseName);
}
