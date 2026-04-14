import "server-only";

import { z } from "zod";

import {
  ACCOUNT_NOTIFICATION_SETTINGS,
  createDefaultAccountState,
  DEFAULT_PREFERRED_COMPETITIONS,
} from "@/lib/account-config";
import { getDatabase, getOptionalDatabase } from "@/lib/mongodb";

const accountProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

const accountPreferencesSchema = z.object({
  notifications: z.object({
    valueBet: z.boolean(),
    liveAlert: z.boolean(),
    formazioni: z.boolean(),
    combo: z.boolean(),
  }),
  preferredCompetitions: z.array(z.string().trim().min(1).max(80)).max(20),
});

const accountWatchlistSchema = z.object({
  matches: z.array(z.string().trim().min(1).max(120)).max(200),
  teams: z.array(z.string().trim().min(1).max(120)).max(100),
  players: z.array(z.string().trim().min(1).max(120)).max(200),
});

const accountFollowingSchema = z.object({
  matches: z.array(z.string().trim().min(1).max(120)).max(200),
  teams: z.array(z.string().trim().min(1).max(120)).max(100),
  players: z.array(z.string().trim().min(1).max(120)).max(200),
  competitions: z.array(z.string().trim().min(1).max(120)).max(100),
});

function sanitizeUniqueStrings(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim())
        .filter(Boolean)
    )
  );
}

function normalizeNotifications(value) {
  return {
    valueBet: Boolean(value?.valueBet ?? ACCOUNT_NOTIFICATION_SETTINGS.valueBet),
    liveAlert: Boolean(value?.liveAlert ?? ACCOUNT_NOTIFICATION_SETTINGS.liveAlert),
    formazioni: Boolean(
      value?.formazioni ?? ACCOUNT_NOTIFICATION_SETTINGS.formazioni
    ),
    combo: Boolean(value?.combo ?? ACCOUNT_NOTIFICATION_SETTINGS.combo),
  };
}

function normalizePreferredCompetitions(value) {
  const nextValue = sanitizeUniqueStrings(value);
  return nextValue.length > 0 ? nextValue.slice(0, 20) : DEFAULT_PREFERRED_COMPETITIONS;
}

function normalizeWatchlist(value) {
  return {
    matches: sanitizeUniqueStrings(value?.matches).map((entry) => String(entry)),
    teams: sanitizeUniqueStrings(value?.teams),
    players: sanitizeUniqueStrings(value?.players),
  };
}

function normalizeFollowing(value) {
  return {
    matches: sanitizeUniqueStrings(value?.matches),
    teams: sanitizeUniqueStrings(value?.teams),
    players: sanitizeUniqueStrings(value?.players),
    competitions: sanitizeUniqueStrings(value?.competitions),
  };
}

function normalizeAuthProviders(values = []) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => String(value || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

let accountCollectionsReadyPromise = null;

async function ensureAccountCollectionsReady(db) {
  if (accountCollectionsReadyPromise) {
    return accountCollectionsReadyPromise;
  }

  accountCollectionsReadyPromise = Promise.all([
    db.collection("userAccountSettings").createIndex(
      { userId: 1 },
      { unique: true, name: "userId_unique" }
    ),
    db.collection("userWatchlists").createIndex(
      { userId: 1 },
      { unique: true, name: "userId_unique" }
    ),
    db.collection("userFollowings").createIndex(
      { userId: 1 },
      { unique: true, name: "userId_unique" }
    ),
    db.collection("accounts").createIndex(
      { userId: 1 },
      { name: "userId_lookup" }
    ),
    db.collection("users").createIndex(
      { id: 1 },
      {
        unique: true,
        name: "id_unique",
        partialFilterExpression: {
          id: { $type: "string" },
        },
      }
    ),
    db.collection("users").createIndex(
      { email: 1 },
      { name: "email_lookup" }
    ),
  ]).catch((error) => {
    accountCollectionsReadyPromise = null;
    throw error;
  });

  return accountCollectionsReadyPromise;
}

export async function getUserAccountState({
  userId = "",
  email = "",
  name = "",
} = {}) {
  const db = await getOptionalDatabase();
  const defaultState = createDefaultAccountState({
    userId,
    email,
    displayName: name,
  });
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!db) {
    return defaultState;
  }

  await ensureAccountCollectionsReady(db);

  const [settingsDoc, watchlistDoc, followingDoc, authAccounts] = await Promise.all([
    db.collection("userAccountSettings").findOne({ userId: String(userId) }),
    db.collection("userWatchlists").findOne({ userId: String(userId) }),
    db.collection("userFollowings").findOne({ userId: String(userId) }),
    db
      .collection("accounts")
      .find(
        { userId: String(userId) },
        { projection: { _id: 0, providerId: 1 } }
      )
      .toArray(),
  ]);

  const normalizedProfile = {
    ...defaultState.profile,
    ...(settingsDoc?.profile || {}),
  };
  const normalizedPreferences = {
    notifications: normalizeNotifications(settingsDoc?.preferences?.notifications),
    preferredCompetitions: normalizePreferredCompetitions(
      settingsDoc?.preferences?.preferredCompetitions
    ),
  };
  const normalizedWatchlist = normalizeWatchlist(watchlistDoc?.watchlist);
  const normalizedFollowing = normalizeFollowing(followingDoc?.following);
  const authProviders = normalizeAuthProviders(
    authAccounts.map((account) => account.providerId)
  );
  const primaryAuthProvider = authProviders[0] || null;

  await Promise.all([
    db.collection("userAccountSettings").updateOne(
      { userId: String(userId) },
      {
        $set: {
          userId: String(userId),
          email: normalizedEmail || null,
          profile: normalizedProfile,
          preferences: normalizedPreferences,
          updatedAt: settingsDoc?.updatedAt || new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    ),
    db.collection("userWatchlists").updateOne(
      { userId: String(userId) },
      {
        $set: {
          userId: String(userId),
          email: normalizedEmail || null,
          watchlist: normalizedWatchlist,
          updatedAt: watchlistDoc?.updatedAt || new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    ),
    db.collection("userFollowings").updateOne(
      { userId: String(userId) },
      {
        $set: {
          userId: String(userId),
          email: normalizedEmail || null,
          following: normalizedFollowing,
          updatedAt: followingDoc?.updatedAt || new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    ),
  ]);

  return {
    profile: normalizedProfile,
    preferences: normalizedPreferences,
    watchlist: normalizedWatchlist,
    following: normalizedFollowing,
    meta: {
      userId: String(userId),
      email: normalizedEmail || null,
      settingsUpdatedAt: settingsDoc?.updatedAt || null,
      watchlistUpdatedAt: watchlistDoc?.updatedAt || null,
      followingUpdatedAt: followingDoc?.updatedAt || null,
      authProviders,
      primaryAuthProvider,
    },
  };
}

export async function saveUserProfile({
  userId,
  email,
  displayName,
} = {}) {
  const result = accountProfileSchema.safeParse({
    displayName,
  });

  if (!result.success) {
    throw new Error("Nome profilo non valido.");
  }

  const db = await getDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const now = new Date();

  await ensureAccountCollectionsReady(db);

  await Promise.all([
    db.collection("userAccountSettings").updateOne(
      { userId: String(userId) },
      {
        $set: {
          userId: String(userId),
          email: normalizedEmail || null,
          profile: {
            displayName: result.data.displayName,
          },
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    ),
    db.collection("users").updateOne(
      { id: String(userId) },
      {
        $set: {
          name: result.data.displayName,
          email: normalizedEmail || null,
          updatedAt: now,
        },
      }
    ),
  ]);

  return getUserAccountState({
    userId,
    email: normalizedEmail,
    name: result.data.displayName,
  });
}

export async function saveUserPreferences({
  userId,
  email,
  name,
  notifications,
  preferredCompetitions,
} = {}) {
  const normalizedPayload = {
    notifications: normalizeNotifications(notifications),
    preferredCompetitions: normalizePreferredCompetitions(preferredCompetitions),
  };

  const result = accountPreferencesSchema.safeParse(normalizedPayload);

  if (!result.success) {
    throw new Error("Preferenze account non valide.");
  }

  const db = await getDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const now = new Date();

  await ensureAccountCollectionsReady(db);

  await db.collection("userAccountSettings").updateOne(
    { userId: String(userId) },
    {
      $set: {
        userId: String(userId),
        email: normalizedEmail || null,
        preferences: result.data,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return getUserAccountState({
    userId,
    email: normalizedEmail,
    name,
  });
}

export async function saveUserWatchlist({
  userId,
  email,
  name,
  watchlist,
} = {}) {
  const normalizedWatchlist = normalizeWatchlist(watchlist);
  const result = accountWatchlistSchema.safeParse(normalizedWatchlist);

  if (!result.success) {
    throw new Error("Watchlist non valida.");
  }

  const db = await getDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const now = new Date();

  await ensureAccountCollectionsReady(db);

  await db.collection("userWatchlists").updateOne(
    { userId: String(userId) },
    {
      $set: {
        userId: String(userId),
        email: normalizedEmail || null,
        watchlist: result.data,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return getUserAccountState({
    userId,
    email: normalizedEmail,
    name,
  });
}

export async function saveUserFollowing({
  userId,
  email,
  name,
  following,
} = {}) {
  const normalizedFollowing = normalizeFollowing(following);
  const result = accountFollowingSchema.safeParse(normalizedFollowing);

  if (!result.success) {
    throw new Error("Impostazioni seguiti non valide.");
  }

  const db = await getDatabase();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const now = new Date();

  await ensureAccountCollectionsReady(db);

  await db.collection("userFollowings").updateOne(
    { userId: String(userId) },
    {
      $set: {
        userId: String(userId),
        email: normalizedEmail || null,
        following: result.data,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );

  return getUserAccountState({
    userId,
    email: normalizedEmail,
    name,
  });
}
