/**
 * Quick check that the database in DATABASE_URL works: creates a table,
 * inserts a row and reads it back. Prints only the host, never credentials.
 *
 *   npm run db:smoke                       # uses .env
 *   npx tsx --env-file=.env.local scripts/neon-smoke-test.ts
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const prisma = new PrismaClient({ datasourceUrl: url });

async function main() {
  console.log(`Connecting to ${new URL(url!).host} ...`);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS smoke_test (
      id         SERIAL PRIMARY KEY,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const [inserted] = await prisma.$queryRaw<{ id: number }[]>`
    INSERT INTO smoke_test (message) VALUES (${"Hello from team-tracker"}) RETURNING id
  `;

  const rows = await prisma.$queryRaw`
    SELECT id, message, created_at FROM smoke_test WHERE id = ${inserted.id}
  `;
  console.log("Row read back:");
  console.table(rows);

  const [{ version }] = await prisma.$queryRaw<{ version: string }[]>`SELECT version()`;
  console.log(version);
}

main()
  .catch((err) => {
    console.error("Smoke test failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
