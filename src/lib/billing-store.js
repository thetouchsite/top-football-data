import "server-only";

import { getOptionalDatabase } from "@/lib/mongodb";
import { syncUserAccess } from "@/lib/auth-access";
import {
  createSubscriptionState,
  isActiveSubscriptionStatus,
} from "@/lib/domain/subscriptions";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const USERS_COLLECTION = "users";

function buildLookupQuery({ customerId = "", subscriptionId = "", email = "" } = {}) {
  if (customerId) {
    return { customerId };
  }

  if (subscriptionId) {
    return { subscriptionId };
  }

  if (email) {
    return { email };
  }

  return null;
}

async function findExistingBilling(db, identifiers = {}) {
  const query = buildLookupQuery(identifiers);

  if (!query) {
    return null;
  }

  return db.collection(SUBSCRIPTIONS_COLLECTION).findOne(query, {
    sort: { updatedAt: -1 },
  });
}

export async function upsertBillingState(input = {}) {
  const db = await getOptionalDatabase();

  if (!db) {
    throw new Error(
      "Storage billing non disponibile in locale. Verifica la connessione MongoDB."
    );
  }

  const existing = await findExistingBilling(db, input);
  const billingState = createSubscriptionState(input, existing || {});
  const subscriptionQuery = buildLookupQuery(billingState);

  if (!subscriptionQuery) {
    throw new Error("Impossibile salvare lo stato billing senza identificatori.");
  }

  await db.collection(SUBSCRIPTIONS_COLLECTION).updateOne(
    subscriptionQuery,
    {
      $set: {
        ...billingState,
        updatedAt: new Date(billingState.updatedAt),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );

  const userQuery = billingState.customerId
    ? { customerId: billingState.customerId }
    : billingState.email
      ? { email: billingState.email }
      : null;

  if (userQuery) {
    await db.collection(USERS_COLLECTION).updateOne(
      userQuery,
      {
        $set: {
          customerId: billingState.customerId,
          email: billingState.email,
          plan: billingState.plan,
          isPremium: billingState.isPremium,
          subscriptionId: billingState.subscriptionId,
          subscriptionStatus: billingState.subscriptionStatus,
          currentPeriodEnd: billingState.currentPeriodEnd
            ? new Date(billingState.currentPeriodEnd)
            : null,
          lastBillingSyncAt: new Date(billingState.updatedAt),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  await syncUserAccess({
    email: billingState.email,
    plan: billingState.plan,
    isPremium: billingState.isPremium,
  });

  return billingState;
}

export async function getBillingState(identifiers = {}) {
  const db = await getOptionalDatabase();

  if (!db) {
    return null;
  }

  const record = await findExistingBilling(db, identifiers);

  return record ? createSubscriptionState(record) : null;
}

export async function markBillingAsInactive(input = {}) {
  return upsertBillingState({
    ...input,
    isPremium: false,
    subscriptionStatus: input.subscriptionStatus || "inactive",
  });
}

export { isActiveSubscriptionStatus };
