import { NextResponse } from "next/server";
import { retrieveCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

function isActiveSubscription(status) {
  return ["active", "trialing"].includes(String(status || "").toLowerCase());
}

export async function GET(request) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "session_id mancante." },
        { status: 400 }
      );
    }

    const session = await retrieveCheckoutSession(sessionId);
    const subscription = session.subscription;
    const customer = session.customer;
    const subscriptionStatus =
      typeof subscription === "object" ? subscription.status : null;
    const currentPeriodEnd =
      typeof subscription === "object" &&
      typeof subscription.current_period_end === "number"
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null;

    return NextResponse.json({
      billing: {
        customerId:
          typeof customer === "object" ? customer.id : session.customer || null,
        email:
          typeof customer === "object"
            ? customer.email
            : session.customer_details?.email || session.customer_email || null,
        plan: "premium",
        isPremium: isActiveSubscription(subscriptionStatus),
        subscriptionStatus,
        currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve Stripe session:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Impossibile verificare la sessione Stripe.",
      },
      { status: 500 }
    );
  }
}
