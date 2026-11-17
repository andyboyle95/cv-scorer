// Applies db/migrations/*.sql in order. Safe to run on every deploy.
import postgres from "postgres";
import { readdirSync, readFileSync } from "node:fs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, {
  max: 1,
  ssl: process.env.DATABASE_SSL === "false" || /localhost|127\.0\.0\.1/.test(url) ? false : "require",
  onnotice: () => {},
});

await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const done = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name));
const files = readdirSync("db/migrations").filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  if (done.has(f)) continue;
  const body = readFileSync(`db/migrations/${f}`, "utf8");
  await sql.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`INSERT INTO schema_migrations (name) VALUES (${f})`;
  });
  console.log(`applied ${f}`);
}
await sql.end();
