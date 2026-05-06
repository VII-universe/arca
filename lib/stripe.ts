import Stripe from "stripe";

// Singleton — reused across hot-reloads in dev
const globalForStripe = globalThis as unknown as { stripe?: Stripe };

export const stripe =
  globalForStripe.stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") globalForStripe.stripe = stripe;

// Price IDs — set these in .env after creating products in Stripe dashboard
export const STRIPE_PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY ?? "";
export const STRIPE_PRICE_LIFETIME = process.env.STRIPE_PRICE_LIFETIME ?? "";
