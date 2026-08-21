import postgres from "postgres";

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("Thiếu DATABASE_URL — kiểm tra web/.env.local");
}

const globalForSql = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForSql.sql ??
  postgres(url, {
    max: 8,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForSql.sql = sql;
}
