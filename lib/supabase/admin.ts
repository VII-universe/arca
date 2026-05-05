// Service-role Supabase client — bypasses RLS entirely.
// ONLY use this server-side (API routes, Server Components, Server Actions).
// NEVER import this in any "use client" file — the key would be exposed.
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy",
  {
    auth: {
      // Disable session management — we only use this for storage operations
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
