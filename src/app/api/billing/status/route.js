import { NextResponse } from "next/server";

import { getBillingState } from "@/lib/billing-store";

export const runtime = "nodejs";

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

export async function GET(request) {
  try {
    const customerId = String(
      request.nextUrl.searchParams.get("customerId") || ""
    ).trim();
    const email = String(
      request.nextUrl.searchParams.get("email") || ""
    ).trim();

    if (!customerId && !email) {
      return NextResponse.json({ billing: EMPTY_BILLING_STATE });
    }

    const billing = await getBillingState({ customerId, email });

    return NextResponse.json({
      billing: billing || {
        ...EMPTY_BILLING_STATE,
        customerId: customerId || null,
        email: email || null,
      },
    });
  } catch (error) {
    console.error("Failed to resolve billing status:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Impossibile recuperare lo stato billing server-side.",
      },
      { status: 500 }
    );
  }
}
