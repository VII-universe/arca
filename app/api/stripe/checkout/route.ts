import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import { stripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME } from "@/lib/stripe";
import { APP_URL } from "@/lib/resend";
import { hasProAccess } from "@/lib/auth/user";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const plan: "monthly" | "lifetime" = body.plan === "lifetime" ? "lifetime" : "monthly";

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { id: true, email: true, name: true, isPremium: true, role: true, stripeCustomerId: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const userForCheck = { ...dbUser, role: dbUser.role as "USER" | "ADMIN" };
  if (hasProAccess(userForCheck)) {
    return NextResponse.json({ error: "Already Pro" }, { status: 400 });
  }

  const priceId = plan === "lifetime" ? STRIPE_PRICE_LIFETIME : STRIPE_PRICE_MONTHLY;
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured. Add STRIPE_PRICE_MONTHLY / STRIPE_PRICE_LIFETIME to env." },
      { status: 500 }
    );
  }

  // Reuse existing Stripe customer or create a new one
  let customerId = dbUser.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser.email,
      name: dbUser.name,
      metadata: { userId: dbUser.id },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const isLifetime = plan === "lifetime";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isLifetime ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/dashboard/billing?success=1`,
    cancel_url: `${APP_URL}/dashboard/billing?canceled=1`,
    metadata: { userId: dbUser.id, plan },
    ...(isLifetime
      ? {}
      : {
          subscription_data: {
            metadata: { userId: dbUser.id },
          },
        }),
  });

  return NextResponse.json({ url: session.url });
}
