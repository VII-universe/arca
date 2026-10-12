# Arca

Dead-man switch application for delivering personal messages and practical/estate information (accounts, documents, instructions) to loved ones after a configured trigger.

## Testing

- `npm test` — unit tests (Vitest) for pure logic (`lib/triggers/milestone.ts`). No DB or env vars required.
- `npm run test:e2e` — e2e tests (Playwright) covering the compose → trigger → delivery critical path and the Stripe webhook. Runs against the real project DB using throwaway Supabase accounts created and deleted per test — **do not point `DATABASE_URL` at a database you care about**. Requires `.env.local` with `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `CRON_SECRET`; the cron test skips itself if `CRON_SECRET` is unset. Builds and starts the app on port 3411 automatically.
