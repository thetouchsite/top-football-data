import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import { getSportmonksProviderReadiness } from "@/lib/providers/sportmonks";
import { getPremiumPlan, getStripe, getStripeMode } from "@/lib/stripe";

export const runtime = "nodejs";

async function getMongoReadiness() {
  try {
    const db = await getDatabase();
    await db.command({ ping: 1 });

    return {
      configured: Boolean(process.env.MONGODB_URI),
      ready: true,
      database: process.env.MONGODB_DB || "top-football-pulse",
    };
  } catch (error) {
    return {
      configured: Boolean(process.env.MONGODB_URI),
      ready: false,
      database: process.env.MONGODB_DB || "top-football-pulse",
      error: error.message,
    };
  }
}

function getStripeReadiness() {
  try {
    const stripe = getStripe();
    const plan = getPremiumPlan();

    return {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      ready: Boolean(stripe) && Boolean(plan.priceId),
      mode: getStripeMode(),
      priceId: plan.priceId,
    };
  } catch (error) {
    return {
      configured: Boolean(process.env.STRIPE_SECRET_KEY),
      ready: false,
      mode: getStripeMode(),
      priceId: process.env.STRIPE_PREMIUM_PRICE_ID || null,
      error: error.message,
    };
  }
}

export async function GET() {
  const mongodb = await getMongoReadiness();
  const stripe = getStripeReadiness();
  const sportmonks = getSportmonksProviderReadiness();

  return NextResponse.json({
    ok: mongodb.ready && stripe.ready && sportmonks.ready,
    runtime,
    envMode:
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    mongodbConfigured: Boolean(process.env.MONGODB_URI),
    readiness: {
      mongodb,
      stripe,
      providers: {
        sportmonks,
      },
    },
  });
}
