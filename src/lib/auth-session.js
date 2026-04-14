import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";
import { getBillingState } from "@/lib/billing-store";
import { APP_ROLES, resolveAppRole, syncUserAccess } from "@/lib/auth-access";

const EMPTY_BILLING_STATE = {
  customerId: null,
  subscriptionId: null,
  email: null,
  plan: "free",
  isPremium: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  source: "server_state_missing",
  updatedAt: null,
};

export async function getServerAuthSession() {
  const { auth } = await getAuth();

  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getEnrichedServerSession() {
  const session = await getServerAuthSession();

  if (!session?.user?.email) {
    return {
      session: null,
      billing: EMPTY_BILLING_STATE,
      role: null,
      isPremium: false,
    };
  }

  const billing =
    (await getBillingState({
      email: session.user.email,
    })) || {
      ...EMPTY_BILLING_STATE,
      email: session.user.email,
    };

  const syncedAccess = await syncUserAccess({
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    plan: billing.plan || session.user.plan || "free",
    isPremium: Boolean(billing.isPremium),
  });

  return {
    session: {
      ...session,
      user: {
        ...session.user,
        role: syncedAccess.role,
        plan: syncedAccess.plan,
        isPremium: syncedAccess.isPremium,
      },
    },
    billing: {
      ...billing,
      plan: syncedAccess.plan,
      isPremium: syncedAccess.isPremium,
    },
    role: syncedAccess.role,
    isPremium:
      syncedAccess.role === APP_ROLES.admin ||
      syncedAccess.role === APP_ROLES.premium,
  };
}

export async function requireAuthenticatedPage(nextPath = "/account") {
  const enriched = await getEnrichedServerSession();

  if (!enriched.session) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return enriched;
}

export async function requireAdminPage(nextPath = "/admin") {
  const enriched = await requireAuthenticatedPage(nextPath);

  if (resolveAppRole({ role: enriched.role }) !== APP_ROLES.admin) {
    redirect("/account");
  }

  return enriched;
}

export async function requireAuthenticatedRequest() {
  const enriched = await getEnrichedServerSession();

  if (!enriched.session) {
    return null;
  }

  return enriched;
}

export async function requireAdminRequest() {
  const enriched = await requireAuthenticatedRequest();

  if (!enriched) {
    return null;
  }

  if (resolveAppRole({ role: enriched.role }) !== APP_ROLES.admin) {
    return false;
  }

  return enriched;
}
