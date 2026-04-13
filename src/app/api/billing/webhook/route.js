import { NextResponse } from "next/server";

import {
  markBillingAsInactive,
  upsertBillingState,
} from "@/lib/billing-store";
import { constructStripeEvent, retrieveCheckoutSession } from "@/lib/stripe";

export const runtime = "nodejs";

function getSubscriptionPayload(subscription, overrides = {}) {
  const currentPeriodEnd =
    typeof subscription?.current_period_end === "number"
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null;

  return {
    customerId: String(subscription?.customer || "").trim() || null,
    subscriptionId: String(subscription?.id || "").trim() || null,
    email: overrides.email || null,
    plan: overrides.plan || subscription?.metadata?.planId || "premium",
    subscriptionStatus: subscription?.status || null,
    currentPeriodEnd,
    source: overrides.source || "stripe_webhook",
    updatedAt: new Date(),
  };
}

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "stripe-signature mancante." },
      { status: 400 }
    );
  }

  let event;

  try {
    const payload = await request.text();
    event = constructStripeEvent(payload, signature);
  } catch (error) {
    console.error("Invalid Stripe webhook signature:", error);

    return NextResponse.json(
      { error: "Firma webhook Stripe non valida." },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = await retrieveCheckoutSession(event.data.object.id);
        const subscription =
          typeof session.subscription === "object" ? session.subscription : null;
        const customer =
          typeof session.customer === "object" ? session.customer : null;

        if (subscription) {
          await upsertBillingState(
            getSubscriptionPayload(subscription, {
              customerId: customer?.id || session.customer || null,
              email:
                customer?.email ||
                session.customer_details?.email ||
                session.customer_email ||
                null,
              plan: session.metadata?.planId || "premium",
              source: "stripe_webhook_checkout_completed",
            })
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await upsertBillingState(
          getSubscriptionPayload(event.data.object, {
            source: `stripe_webhook_${event.type.replace(/\./g, "_")}`,
          })
        );
        break;
      }

      case "customer.subscription.deleted": {
        await markBillingAsInactive(
          getSubscriptionPayload(event.data.object, {
            source: "stripe_webhook_subscription_deleted",
            subscriptionStatus: event.data.object?.status || "canceled",
          })
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;

        await markBillingAsInactive({
          customerId: String(invoice?.customer || "").trim() || null,
          subscriptionId: String(invoice?.subscription || "").trim() || null,
          email: invoice?.customer_email || null,
          plan: "premium",
          subscriptionStatus: invoice?.status || "payment_failed",
          source: "stripe_webhook_invoice_payment_failed",
          updatedAt: new Date(),
        });
        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      ok: true,
      received: true,
      type: event.type,
    });
  } catch (error) {
    console.error("Failed to process Stripe webhook:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile processare il webhook Stripe.",
      },
      { status: 500 }
    );
  }
}
