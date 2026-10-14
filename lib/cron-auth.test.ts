import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function requestWith(authHeader: string | undefined): Request {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("Authorization", authHeader);
  return new Request("https://example.com/api/cron/reminders", { headers });
}

describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_SECRET;
  });

  it("rejects a request with no Authorization header", () => {
    process.env.CRON_SECRET = "a-real-secret";
    expect(isAuthorizedCronRequest(requestWith(undefined))).toBe(false);
  });

  it("rejects a request with the wrong token", () => {
    process.env.CRON_SECRET = "a-real-secret";
    expect(isAuthorizedCronRequest(requestWith("Bearer wrong-token-x"))).toBe(false);
  });

  it("rejects a non-Bearer Authorization scheme", () => {
    process.env.CRON_SECRET = "a-real-secret";
    expect(isAuthorizedCronRequest(requestWith("Basic a-real-secret"))).toBe(false);
  });

  it("accepts the correct Bearer token", () => {
    process.env.CRON_SECRET = "a-real-secret";
    expect(isAuthorizedCronRequest(requestWith("Bearer a-real-secret"))).toBe(true);
  });

  it("fails closed when CRON_SECRET is unset, even with a matching-looking token", () => {
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(requestWith("Bearer "))).toBe(false);
  });
});
