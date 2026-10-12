// Covers the "trigger" and "delivery" legs of compose → trigger → delivery
// that compose-flow.spec.ts doesn't reach (cron runs on its own schedule,
// not from the browser). Seeds a pack whose SPECIFIC_DATE trigger is
// already due, calls the real cron endpoint exactly as Vercel Cron would,
// and asserts the DB transition that marks a message as delivered.
//
// Does not assert the recipient actually received an email — Resend send
// failures are swallowed by the route (by design, see the route's comment)
// so that a flaky mail provider never blocks the trigger from firing. We
// only have DB-visible evidence to check here.
// .env.local is loaded in playwright.config.ts before workers spawn.
import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, type TestUser } from "./helpers/test-user";
import { prisma } from "@/lib/prisma/client";

let user: TestUser;
let packId: string;

test.beforeAll(async () => {
  user = await createTestUser({ name: "E2E Cron User" });

  const pack = await prisma.messagePack.create({
    data: {
      title: "E2E cron trigger test",
      type: "EMOTIONAL",
      status: "ACTIVE",
      messageMode: "LEGACY",
      livingLinkHash: `e2e-cron-${Date.now()}`,
      owner: { connect: { id: user.authId } },
      triggerCondition: {
        create: {
          type: "SPECIFIC_DATE",
          status: "PENDING",
          executeAtDate: new Date(Date.now() - 60_000), // 1 minute in the past — already due
        },
      },
    },
  });
  packId = pack.id;

  await prisma.recipient.create({
    data: {
      name: "E2E Recipient",
      // Resend's documented test address — always accepted, never really
      // delivered. A real-looking domain like @example.com gets rejected
      // by Resend outright ("Invalid `to` field"), which is harmless here
      // (the route swallows email failures) but adds misleading error
      // noise to the server log.
      email: "delivered@resend.dev",
      messagePack: { connect: { id: packId } },
    },
  });
});

test.afterAll(async () => {
  await prisma.messagePack.delete({ where: { id: packId } }).catch(() => {});
  await deleteTestUser(user.authId);
});

test("cron sweep A marks a due SPECIFIC_DATE pack as TRIGGERED", async ({ request }) => {
  const cronSecret = process.env.CRON_SECRET;
  test.skip(!cronSecret, "CRON_SECRET not set in this environment — see hardening-roadmap memory");

  const res = await request.get("/api/cron/process-triggers", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  expect(res.ok()).toBe(true);

  const body = await res.json();
  expect(body.results.sweepA.error).toBeNull();
  expect(body.results.sweepA.triggered).toBeGreaterThanOrEqual(1);

  const updated = await prisma.messagePack.findUnique({
    where: { id: packId },
    include: { triggerCondition: true },
  });
  expect(updated?.status).toBe("TRIGGERED");
  expect(updated?.triggerCondition?.status).toBe("EXECUTED");
});

test("an unauthorized cron request is rejected", async ({ request }) => {
  const res = await request.get("/api/cron/process-triggers", {
    headers: { Authorization: "Bearer wrong-secret" },
  });
  expect(res.status()).toBe(401);
});
