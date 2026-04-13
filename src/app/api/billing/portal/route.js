import { NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const customerId = String(payload?.customerId || "").trim();

    if (!customerId) {
      return NextResponse.json(
        { error: "customerId mancante." },
        { status: 400 }
      );
    }

    const session = await createBillingPortalSession(customerId);

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    console.error("Failed to create Stripe billing portal session:", error);

    return NextResponse.json(
      {
        error:
          error.message ||
          "Impossibile creare la sessione Billing Portal di Stripe.",
      },
      { status: 500 }
    );
  }
}
