// Shared throwaway-account helper for e2e tests. Creates a real Supabase
// Auth user + matching Prisma User row, and tears both down afterward —
// the same pattern used for manual verification throughout the i18n
// rollout, now codified so it runs in an automated test suite.
//
// Runs against the real project DB (see hardening-roadmap memory: no
// dedicated test Supabase project exists yet) — every test MUST clean up
// after itself via deleteTestUser.
// Env vars (.env.local) are loaded once in playwright.config.ts, before
// Playwright spawns worker processes — those inherit process.env, so by
// the time this module (or any test file) runs, everything below sees
// the real values instead of lib/supabase/admin.ts's "dummy" fallback.
import { prisma } from "@/lib/prisma/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface TestUser {
  authId: string;
  email: string;
  password: string;
}

export async function createTestUser(opts: { name?: string; isPremium?: boolean } = {}): Promise<TestUser> {
  const email = `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "TestPass123!";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`createTestUser: Supabase admin createUser failed: ${error?.message}`);

  const authId = data.user.id;

  await prisma.user.create({
    data: {
      id: authId,
      email,
      name: opts.name ?? "E2E Test User",
      lastActiveAt: new Date(),
      isPremium: opts.isPremium ?? false,
    },
  });

  return { authId, email, password };
}

export async function deleteTestUser(authId: string): Promise<void> {
  await prisma.user.delete({ where: { id: authId } }).catch(() => {
    // Already gone (e.g. a test that deleted it itself) — fine.
  });
  const { error } = await supabaseAdmin.auth.admin.deleteUser(authId);
  if (error) {
    // Don't fail the test run over cleanup — but make it loud in CI logs.
    console.error(`deleteTestUser: failed to delete Supabase Auth user ${authId}: ${error.message}`);
  }
}
