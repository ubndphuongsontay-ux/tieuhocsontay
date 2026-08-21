import postgres from "postgres";

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

function createSql() {
  const url = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Thiếu DATABASE_URL — kiểm tra biến môi trường trên Vercel hoặc web/.env.local");
  }
  const isPooled = /supabase\.(co|com)|neon\.tech|pooler/i.test(url);
  return postgres(url, {
    max: isPooled ? 1 : 8,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isPooled ? true : undefined,
    prepare: isPooled ? false : undefined,
  });
}

function getSql() {
  if (!globalForSql.sql) {
    globalForSql.sql = createSql();
  }
  return globalForSql.sql;
}

/** Lazy: không kết nối DB lúc import, để `next build` trên Vercel không vỡ. */
export const sql: ReturnType<typeof postgres> = new Proxy(function sql() {} as unknown as ReturnType<typeof postgres>, {
  apply(_target, _thisArg, argArray) {
    const client = getSql() as unknown as (...args: unknown[]) => unknown;
    return client(...argArray);
  },
  get(_target, prop, _receiver) {
    const client = getSql() as unknown as Record<PropertyKey, unknown>;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
