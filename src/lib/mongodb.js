import { MongoClient } from "mongodb";

const globalForMongo = globalThis;

if (!globalForMongo.__mongoConnection) {
  globalForMongo.__mongoConnection = {
    client: null,
    promise: null,
  };
}

const cachedConnection = globalForMongo.__mongoConnection;
let mongoFailureLogged = false;

function logMongoFailure(error) {
  if (mongoFailureLogged || process.env.NODE_ENV === "production") {
    return;
  }

  mongoFailureLogged = true;
  console.warn(
    "[mongodb] Connessione Mongo non disponibile. In locale useremo fallback degradati dove previsto.",
    error
  );
}

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

  try {
    cachedConnection.client = await cachedConnection.promise;
    return cachedConnection.client;
  } catch (error) {
    cachedConnection.promise = null;
    logMongoFailure(error);
    throw error;
  }
}

export async function getDatabase() {
  const client = await getMongoClient();
  const databaseName = process.env.MONGODB_DB || "top-football-pulse";
  return client.db(databaseName);
}

export async function getOptionalMongoClient() {
  try {
    return await getMongoClient();
  } catch {
    return null;
  }
}

export async function getOptionalDatabase() {
  try {
    return await getDatabase();
  } catch {
    return null;
  }
}
