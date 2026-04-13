import { toIsoDate } from "@/lib/domain/freshness";

export function isActiveSubscriptionStatus(status) {
  return ["active", "trialing"].includes(String(status || "").toLowerCase());
}

/**
 * @typedef {Object} SubscriptionState
 * @property {string|null} customerId
 * @property {string|null} subscriptionId
 * @property {string|null} email
 * @property {string} plan
 * @property {boolean} isPremium
 * @property {string|null} subscriptionStatus
 * @property {string|null} currentPeriodEnd
 * @property {string} source
 * @property {string|null} updatedAt
 */

export function createSubscriptionState(input = {}, existing = {}) {
  const subscriptionStatus =
    input.subscriptionStatus ?? existing.subscriptionStatus ?? null;
  const currentPeriodEnd =
    toIsoDate(input.currentPeriodEnd) ?? toIsoDate(existing.currentPeriodEnd);

  return {
    customerId: input.customerId ?? existing.customerId ?? null,
    subscriptionId: input.subscriptionId ?? existing.subscriptionId ?? null,
    email: input.email ?? existing.email ?? null,
    plan: input.plan ?? existing.plan ?? "free",
    isPremium:
      typeof input.isPremium === "boolean"
        ? input.isPremium
        : isActiveSubscriptionStatus(subscriptionStatus),
    subscriptionStatus,
    currentPeriodEnd,
    source: input.source ?? existing.source ?? "server_state",
    updatedAt: toIsoDate(input.updatedAt) ?? new Date().toISOString(),
  };
}
