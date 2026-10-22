import { unstable_cache } from "next/cache";
import { stripe, STRIPE_PRICE_MONTHLY, STRIPE_PRICE_LIFETIME } from "@/lib/stripe";
import { FREE_LIMITS } from "@/lib/auth/user";

// Prices shown on the marketing site come from the same Stripe Price objects
// the checkout charges (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_LIFETIME), never
// from copy — so the page can't drift from what people actually pay. If
// Stripe isn't configured or reachable, the amount is simply left out.

export interface MarketingPrice {
  /** Minor units, as Stripe stores them (999 = $9.99). */
  unitAmount: number;
  currency: string;
}

export interface MarketingPricing {
  monthly: MarketingPrice | null;
  lifetime: MarketingPrice | null;
  freeMaxMessages: number;
}

async function retrievePrice(priceId: string): Promise<MarketingPrice | null> {
  if (!priceId || !process.env.STRIPE_SECRET_KEY) return null;
  try {
    const price = await stripe.prices.retrieve(priceId);
    if (!price.active || price.unit_amount == null) return null;
    return { unitAmount: price.unit_amount, currency: price.currency };
  } catch (err) {
    console.error("[marketing/pricing] price lookup failed:", err);
    return null;
  }
}

const getStripePrices = unstable_cache(
  async () => {
    const [monthly, lifetime] = await Promise.all([
      retrievePrice(STRIPE_PRICE_MONTHLY),
      retrievePrice(STRIPE_PRICE_LIFETIME),
    ]);
    return { monthly, lifetime };
  },
  ["marketing-stripe-prices"],
  { revalidate: 3600 }
);

export async function getMarketingPricing(): Promise<MarketingPricing> {
  const { monthly, lifetime } = await getStripePrices();
  return { monthly, lifetime, freeMaxMessages: FREE_LIMITS.maxPacks };
}

// Stripe's zero-decimal currencies store whole units, not cents.
const ZERO_DECIMAL = new Set(["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"]);

export function formatPrice(price: MarketingPrice, locale: string): string {
  const major = ZERO_DECIMAL.has(price.currency) ? price.unitAmount : price.unitAmount / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: price.currency.toUpperCase(),
    minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
  }).format(major);
}
