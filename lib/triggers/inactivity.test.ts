import { describe, it, expect, vi, beforeEach } from "vitest";

// Pure unit test — Prisma, Resend and the email templates are mocked, so no
// DB or env vars are needed.
const db = vi.hoisted(() => ({
  claimCount: 1,
  packUpdates: [] as unknown[],
  triggerUpdates: [] as unknown[],
  tokens: [] as { action: string }[],
  sent: [] as { to: string; subject: string }[],
}));

vi.mock("@/lib/prisma/client", () => {
  const tx = {
    messagePack: {
      updateMany: vi.fn(async (args: unknown) => {
        db.packUpdates.push(args);
        return { count: db.claimCount };
      }),
    },
    triggerCondition: {
      update: vi.fn(async (args: unknown) => {
        db.triggerUpdates.push(args);
        return {};
      }),
    },
  };
  return {
    prisma: {
      $transaction: vi.fn(async (arg: unknown) =>
        typeof arg === "function" ? (arg as (t: typeof tx) => unknown)(tx) : Promise.all(arg as Promise<unknown>[])
      ),
      guardianToken: {
        create: vi.fn(async ({ data }: { data: { action: string } }) => {
          db.tokens.push(data);
          return { token: `tok-${db.tokens.length}` };
        }),
      },
    },
  };
});
vi.mock("@/lib/resend", () => ({
  FROM_EMAIL: "arca@example.com",
  APP_URL: "https://arca.example",
  resend: {
    emails: {
      send: vi.fn(async ({ to, subject }: { to: string; subject: string }) => {
        db.sent.push({ to, subject });
        return { error: null };
      }),
    },
  },
}));
vi.mock("@react-email/render", () => ({ render: vi.fn(async () => "<html/>") }));
vi.mock("@/emails/GracePeriodWarningEmail", () => ({ GracePeriodWarningEmail: () => null }));
vi.mock("@/emails/GuardianAlertEmail", () => ({ GuardianAlertEmail: () => null }));

import { startInactivityDelivery, type InactivityPack } from "./inactivity";

const NOW = new Date("2026-10-22T10:00:00Z");

function pack(guardians: InactivityPack["owner"]["guardians"]): InactivityPack {
  return {
    id: "pack-1",
    title: "For when I'm gone",
    triggerConditionId: "trig-1",
    gracePeriodDays: 14,
    owner: { email: "owner@example.com", name: "Jana", guardians },
  };
}

beforeEach(() => {
  db.claimCount = 1;
  db.packUpdates = [];
  db.triggerUpdates = [];
  db.tokens = [];
  db.sent = [];
});

describe("startInactivityDelivery", () => {
  it("asks every guardian first when the owner has guardians", async () => {
    const res = await startInactivityDelivery(
      pack([
        { id: "g1", name: "Tom", email: "tom@example.com" },
        { id: "g2", name: "Eva", email: "eva@example.com" },
      ]),
      NOW
    );

    expect(res).toEqual({ started: true, mode: "guardians", emailsSent: 2 });
    expect(db.packUpdates[0]).toMatchObject({
      where: { id: "pack-1", status: "ACTIVE" },
      data: { status: "PENDING_GUARDIAN_APPROVAL" },
    });
    expect(db.triggerUpdates[0]).toMatchObject({ data: { status: "IN_GRACE_PERIOD", triggeredAt: NOW } });
    // one "they're fine" and one "release" link per guardian
    expect(db.tokens.map((t) => t.action)).toEqual(["CONFIRM_ALIVE", "RELEASE", "CONFIRM_ALIVE", "RELEASE"]);
    expect(db.sent.map((s) => s.to)).toEqual(["tom@example.com", "eva@example.com"]);
  });

  it("warns the owner and enters the grace period when there are no guardians", async () => {
    const res = await startInactivityDelivery(pack([]), NOW);

    expect(res).toEqual({ started: true, mode: "grace", emailsSent: 1 });
    expect(db.packUpdates[0]).toMatchObject({ data: { status: "GRACE_PERIOD" } });
    expect(db.sent).toEqual([{ to: "owner@example.com", subject: 'Your Arca "For when I\'m gone" will be delivered in 14 days' }]);
  });

  it("does nothing when the pack was already claimed by another run", async () => {
    db.claimCount = 0;
    const res = await startInactivityDelivery(pack([{ id: "g1", name: "Tom", email: "tom@example.com" }]), NOW);

    expect(res).toEqual({ started: false, mode: null, emailsSent: 0 });
    expect(db.triggerUpdates).toHaveLength(0);
    expect(db.tokens).toHaveLength(0);
    expect(db.sent).toHaveLength(0);
  });
});
