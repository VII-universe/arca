import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma/client";
import Stripe from "stripe";

export const runtime = "nodejs";

async function activatePro(userId: string, subscriptionId?: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: true,
      ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
    },
  });
}

async function deactivateProBySubscription(subscriptionId: string) {
  await prisma.user.updateMany({
    where: { stripeSubscriptionId: subscriptionId },
    data: { isPremium: false, stripeSubscriptionId: null },
  });
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── One-time payment (lifetime) or subscription checkout ──────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === "payment" && session.payment_status === "paid") {
          await activatePro(userId);
        } else if (session.mode === "subscription") {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : (session.subscription as Stripe.Subscription | null)?.id;
          await activatePro(userId, subId);
        }
        break;
      }

      // ── Subscription renewed successfully ─────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRaw = invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details?.subscription
          : null;
        const subId = typeof subRaw === "string" ? subRaw : subRaw?.id;
        if (!subId) break;

        const sub = await stripe.subscriptions.retrieve(subId);
        const userId = sub.metadata?.userId;
        if (userId) await activatePro(userId, subId);
        break;
      }

      // ── Subscription cancelled ─────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await deactivateProBySubscription(sub.id);
        break;
      }

      // ── Payment failed — optionally downgrade immediately ─────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRaw = invoice.parent?.type === "subscription_details"
          ? invoice.parent.subscription_details?.subscription
          : null;
        const subId = typeof subRaw === "string" ? subRaw : subRaw?.id;
        if (subId) await deactivateProBySubscription(subId);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] Error handling event ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
