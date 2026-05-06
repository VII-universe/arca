import { prisma } from "@/lib/prisma/client";

// Developer accounts that always get full Pro + Admin access.
// This bypasses Stripe entirely for testing purposes.
const ADMIN_EMAILS = new Set([
  "jakubfidler@centrum.cz",
  "fidlerjalub@gmail.com",
]);

export interface ResolvedUser {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  isPremium: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  lastActiveAt: Date;
  webhookSecret: string;
  guardians: { id: string; name: string; email: string }[];
}

/**
 * Fetches (or upserts) the Prisma user for the given Supabase auth user.
 * Admin emails are always treated as isPremium + ADMIN regardless of DB values.
 */
export async function resolveUser(authUser: {
  id: string;
  email?: string;
  user_metadata?: Record<string, string>;
}): Promise<ResolvedUser> {
  const email = authUser.email ?? "";
  const isAdmin = ADMIN_EMAILS.has(email.toLowerCase());

  const dbUser = await prisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: {
      id: authUser.id,
      email,
      name:
        authUser.user_metadata?.full_name ??
        email.split("@")[0] ??
        "User",
      lastActiveAt: new Date(),
      ...(isAdmin && { role: "ADMIN", isPremium: true }),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isPremium: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      lastActiveAt: true,
      webhookSecret: true,
      guardians: {
        select: { id: true, name: true, email: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Admin bypass: overlay isPremium + role without writing to DB every request
  return {
    ...dbUser,
    isPremium: isAdmin ? true : dbUser.isPremium,
    role: (isAdmin ? "ADMIN" : dbUser.role) as "USER" | "ADMIN",
  };
}

/** Quick check used in API routes / server actions. */
export function hasProAccess(user: Pick<ResolvedUser, "isPremium" | "role">): boolean {
  return user.isPremium || user.role === "ADMIN";
}

export const FREE_LIMITS = {
  maxPacks: 1,
  maxStorageMb: 50,
} as const;

export const PRO_LIMITS = {
  maxPacks: Infinity,
  maxStorageMb: 5 * 1024, // 5 GB
} as const;
