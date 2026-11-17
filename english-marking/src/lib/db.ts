import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const local = /localhost|127\.0\.0\.1/.test(url) || process.env.DATABASE_SSL === "false";
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL ?? 8),
    ssl: local ? false : "require",
    onnotice: () => {},
    transform: { undefined: null },
  });
}

/** Shared connection pool (survives hot reloads in dev). */
export const sql: ReturnType<typeof postgres> =
  globalThis.__sql ?? (globalThis.__sql = connect());

export async function audit(action: string, detail: Record<string, unknown> = {}) {
  await sql`INSERT INTO audit_log (action, detail) VALUES (${action}, ${sql.json(detail as never)})`;
}
