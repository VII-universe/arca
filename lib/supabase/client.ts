"use client";

import { createBrowserClient } from "@supabase/ssr";

// Use in Client Components only.
// Singleton pattern — one client instance per browser tab.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
