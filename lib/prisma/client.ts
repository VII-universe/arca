// Prisma 7 requires an explicit driver adapter — it no longer reads DATABASE_URL
// automatically from the environment. We use @prisma/adapter-pg with a pg Pool
// so the connection string is passed at construction time.
import { PrismaClient } from "./generated";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Singleton pinned to globalThis in ALL environments (including production).
// Without this, each hot-reload (dev) or warm Lambda invocation (prod) creates
// a new pg.Pool — exhausting Supabase's connection limit quickly.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function buildClient(): PrismaClient {
  const connectionString =
    process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";

  const pool = new Pool({
    connectionString,
    // Limit connections per Lambda instance to avoid exhausting Supabase's pool.
    // Supabase free tier: 15 concurrent connections total across all clients.
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Always persist to globalThis so the Pool survives warm Lambda invocations.
export const prisma = globalForPrisma.prisma ?? buildClient();
globalForPrisma.prisma = prisma;
