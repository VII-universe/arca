// Prisma 7 requires an explicit driver adapter — it no longer reads DATABASE_URL
// automatically from the environment. We use @prisma/adapter-pg with a pg Pool
// so the connection string is passed at construction time.
import { PrismaClient } from "./generated";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// Singleton pattern: one Pool + one PrismaClient per process.
// In Next.js dev mode, hot-reload creates new module instances, so we pin
// both to globalThis to avoid exhausting the connection pool.
const globalForPrisma = globalThis as unknown as {
  pool: Pool;
  prisma: PrismaClient;
};

function buildClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL || "postgresql://dummy:dummy@localhost:5432/dummy";
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
