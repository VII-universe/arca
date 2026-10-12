// Covers app/api/stripe/webhook/route.ts — no real Stripe account needed.
// Stripe.webhooks.generateTestHeaderString() computes a valid signature
// locally (pure HMAC over the payload + STRIPE_WEBHOOK_SECRET), so this
// talks to our own route only, never to Stripe's API.
//
// Skips itself if STRIPE_WEBHOOK_SECRET isn't configured in this
// environment — see the "Urgent finding" note in the hardening-roadmap
// memory: as of 2026-10-12 this project has no Stripe keys set anywhere
// (prod included), so billing is currently non-functional regardless of
// what this test says.
import { test, expect } from "@playwright/test";
import Stripe from "stripe";
import { createTestUser, deleteTestUser, type TestUser } from "./helpers/test-user";
import { prisma } from "@/lib/prisma/client";

let user: TestUser;

test.beforeAll(async () => {
  user = await createTestUser({ name: "E2E Stripe User", isPremium: false });
});

test.afterAll(async () => {
  await deleteTestUser(user.authId);
});

function buildCheckoutCompletedPayload(userId: string) {
  return JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_e2e_${Date.now()}`,
        object: "checkout.session",
        mode: "payment",
        payment_status: "paid",
        metadata: { userId },
      },
    },
  });
}

test("checkout.session.completed activates Pro for the paying user", async ({ request }) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  test.skip(!webhookSecret, "STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set in this environment — see hardening-roadmap memory");

  // Any key works here — generateTestHeaderString signs locally and never
  // calls the Stripe API.
  const stripe = new Stripe("sk_test_e2e_dummy");
  const payload = buildCheckoutCompletedPayload(user.authId);
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: webhookSecret!,
  });

  const res = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
  });
  expect(res.ok()).toBe(true);

  const updated = await prisma.user.findUnique({ where: { id: user.authId } });
  expect(updated?.isPremium).toBe(true);
});

test("a request with an invalid signature is rejected", async ({ request }) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  test.skip(!webhookSecret, "STRIPE_SECRET_KEY/STRIPE_WEBHOOK_SECRET not set in this environment — see hardening-roadmap memory");

  const payload = buildCheckoutCompletedPayload(user.authId);
  const res = await request.post("/api/stripe/webhook", {
    data: payload,
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": "t=1,v1=not-a-real-signature",
    },
  });
  expect(res.status()).toBe(400);

  // Confirm the forged event was actually rejected, not silently accepted.
  const unchanged = await prisma.user.findUnique({ where: { id: user.authId } });
  expect(unchanged?.isPremium).toBe(false);
});
