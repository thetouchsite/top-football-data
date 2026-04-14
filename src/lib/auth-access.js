import "server-only";

import { getOptionalDatabase } from "@/lib/mongodb";

export const APP_ROLES = {
  user: "user",
  premium: "premium",
  admin: "admin",
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function getAdminEmails() {
  return String(process.env.AUTH_ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function isAdminEmail(email) {
  const normalized = normalizeEmail(email);
  return normalized ? getAdminEmails().includes(normalized) : false;
}

export function normalizeAppRole(role, fallback = APP_ROLES.user) {
  const normalized = String(role || "").trim().toLowerCase();

  if (normalized === APP_ROLES.admin) return APP_ROLES.admin;
  if (normalized === APP_ROLES.premium) return APP_ROLES.premium;
  if (normalized === APP_ROLES.user) return APP_ROLES.user;

  return fallback;
}

export function resolveAppRole({ email, role, isPremium = false } = {}) {
  if (isAdminEmail(email) || normalizeAppRole(role, "") === APP_ROLES.admin) {
    return APP_ROLES.admin;
  }

  if (isPremium || normalizeAppRole(role, "") === APP_ROLES.premium) {
    return APP_ROLES.premium;
  }

  return APP_ROLES.user;
}

export async function syncUserAccess({
  userId = "",
  email = "",
  role = "",
  plan = "free",
  isPremium = false,
} = {}) {
  const normalizedEmail = normalizeEmail(email);
  const resolvedRole = resolveAppRole({
    email: normalizedEmail,
    role,
    isPremium,
  });

  if (!userId && !normalizedEmail) {
    return {
      role: resolvedRole,
      plan,
      isPremium: Boolean(isPremium),
    };
  }

  const db = await getOptionalDatabase();

  if (!db) {
    return {
      role: resolvedRole,
      plan: plan || (resolvedRole === APP_ROLES.premium ? "premium" : "free"),
      isPremium: Boolean(isPremium || resolvedRole === APP_ROLES.premium),
    };
  }

  const query = userId ? { id: String(userId) } : { email: normalizedEmail };

  await db.collection("users").updateOne(
    query,
    {
      $set: {
        email: normalizedEmail || null,
        role: resolvedRole,
        plan: plan || (resolvedRole === APP_ROLES.premium ? "premium" : "free"),
        isPremium: Boolean(isPremium || resolvedRole === APP_ROLES.premium),
        lastAccessSyncAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    role: resolvedRole,
    plan: plan || (resolvedRole === APP_ROLES.premium ? "premium" : "free"),
    isPremium: Boolean(isPremium || resolvedRole === APP_ROLES.premium),
  };
}
