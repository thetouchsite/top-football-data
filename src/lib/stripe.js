import "server-only";
import Stripe from "stripe";

const PREMIUM_PLAN = {
  id: "premium",
  name: "Premium",
  interval: "month",
};

let stripeClient = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable.");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia",
    });
  }

  return stripeClient;
}

export function getPremiumPlan() {
  const priceId = process.env.STRIPE_PREMIUM_PRICE_ID;

  if (!priceId) {
    throw new Error("Missing STRIPE_PREMIUM_PRICE_ID environment variable.");
  }

  return {
    ...PREMIUM_PLAN,
    priceId,
  };
}

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.replace(/^/, "https://") ||
    "http://localhost:3000"
  );
}

export function buildSuccessUrl() {
  return `${getBaseUrl()}/premium?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
}

export function buildCancelUrl() {
  return `${getBaseUrl()}/premium?checkout=cancelled`;
}

export function buildAccountUrl() {
  return `${getBaseUrl()}/account`;
}

export async function createCheckoutSession({ email, planId = "premium" }) {
  if (planId !== "premium") {
    throw new Error("Unsupported plan selected.");
  }

  const stripe = getStripe();
  const plan = getPremiumPlan();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [
      {
        price: plan.priceId,
        quantity: 1,
      },
    ],
    customer_email: email || undefined,
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    subscription_data: {
      metadata: {
        planId: plan.id,
      },
    },
    metadata: {
      planId: plan.id,
    },
    success_url: buildSuccessUrl(),
    cancel_url: buildCancelUrl(),
  });
}

export async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripe();

  return stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["customer", "subscription"],
  });
}

export async function createBillingPortalSession(customerId) {
  const stripe = getStripe();

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: buildAccountUrl(),
  });
}
