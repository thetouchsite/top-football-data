import { NextResponse } from "next/server";
import { createCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const session = await createCheckoutSession({
      email: payload?.email,
      planId: payload?.planId || "premium",
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Failed to create Stripe checkout session:", error);

    return NextResponse.json(
      {
        error:
          error.message || "Impossibile creare la sessione di checkout Stripe.",
      },
      { status: 500 }
    );
  }
}
