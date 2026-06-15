import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  addCreditPackPurchase,
  setSubscriptionState,
  setStripeCustomerId,
} from "@/lib/billing-admin";

function getSubscriptionPeriodEnd(
  subscription: Stripe.Subscription
): string | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (!itemEnd) return null;
  return new Date(itemEnd * 1000).toISOString();
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature error:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (!userId) break;

        if (session.customer && typeof session.customer === "string") {
          await setStripeCustomerId(userId, session.customer);
        }

        if (plan === "credits" && session.mode === "payment") {
          await addCreditPackPurchase(userId, event.id);
        }

        if (plan === "pro" && session.mode === "subscription") {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          if (subscriptionId) {
            const subscription =
              await stripe.subscriptions.retrieve(subscriptionId);

            await setSubscriptionState(userId, {
              tier: "pro",
              status: subscription.status,
              stripeSubscriptionId: subscription.id,
              stripeCustomerId:
                typeof session.customer === "string"
                  ? session.customer
                  : undefined,
              periodEnd: getSubscriptionPeriodEnd(subscription),
            });
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) break;

        const isActive =
          subscription.status === "active" ||
          subscription.status === "trialing";

        await setSubscriptionState(userId, {
          tier: isActive ? "pro" : "free",
          status: subscription.status,
          stripeSubscriptionId: isActive ? subscription.id : null,
          periodEnd: getSubscriptionPeriodEnd(subscription),
        });
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
