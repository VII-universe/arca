// Critical-path e2e test: log in, compose a SELF message through the full
// wizard UI, and verify it lands correctly in the Vault. This is the most
// regression-prone surface in the app (many conditional steps, lots of
// form state) and had zero automated coverage before this test existed.
import { test, expect } from "@playwright/test";
import { createTestUser, deleteTestUser, type TestUser } from "./helpers/test-user";
import { prisma } from "@/lib/prisma/client";

let user: TestUser;

test.beforeAll(async () => {
  user = await createTestUser({ name: "E2E Compose User" });
});

test.afterAll(async () => {
  await deleteTestUser(user.authId);
});

test("compose a SELF message end-to-end and see it in the Vault", async ({ page }) => {
  // ── Log in ──────────────────────────────────────────────────────────
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("/dashboard", { timeout: 15_000 });

  // ── Mode select ─────────────────────────────────────────────────────
  await page.goto("/dashboard/arca/new");
  await page.getByText("Sobě do budoucna", { exact: false }).click();
  await page.waitForLoadState("networkidle");

  // Step 01 — recipient: SELF mode auto-adds the owner as recipient.
  await expect(page.getByText("Ty sama jsi v seznamu")).toBeVisible();

  // Step 02 — kind: Text is selected by default, nothing to do.

  // Step 03 — content: type into the rich text editor.
  const testTitle = `E2E test message ${Date.now()}`;
  const editor = page.locator(".ProseMirror, [contenteditable='true']").first();
  await editor.click();
  await editor.fill(testTitle);

  // Step 04 — trigger: default is "V daný den" (specific date). Pick a
  // concrete near date so the preview panel renders a computed date.
  const dateInput = page.locator('input[type="date"]').first();
  const future = new Date();
  future.setDate(future.getDate() + 30);
  await dateInput.fill(future.toISOString().slice(0, 10));

  // ── Save as draft (avoids the stricter non-draft validation paths) ──
  await page.getByRole("button", { name: /Uložit jako koncept/i }).click();

  // createPackFull redirects to /dashboard/vault on success — the clearest
  // UI signal that the server action didn't throw.
  await page.waitForURL("/dashboard/vault", { timeout: 15_000 });

  // ── Verify the pack itself landed correctly (mode, status, content,
  // recipient) — the Vault overview only shows person cards, not
  // individual titles, so this checks the actual data rather than
  // scraping incidental UI layout. Note: the pack's `title` is server-
  // generated ("<recipient> — Text"), not derived from the editor body —
  // the typed content lands in MessageContent.textBody instead. ──────────
  const pack = await prisma.messagePack.findFirst({
    where: { ownerId: user.authId },
    orderBy: { createdAt: "desc" },
    include: { triggerCondition: true, recipients: true, contents: true },
  });
  expect(pack).not.toBeNull();
  expect(pack?.messageMode).toBe("SELF");
  expect(pack?.status).toBe("DRAFT");
  expect(pack?.contents.some((c) => c.textBody?.includes(testTitle))).toBe(true);
  expect(pack?.recipients.some((r) => r.email === user.email)).toBe(true);
});
