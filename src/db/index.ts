import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool = databaseUrl
  ? (globalForDb.__arenaNextJsPostgresqlPool ??
     new Pool({
       connectionString: databaseUrl,
       ssl:
         databaseUrl.includes("localhost") || databaseUrl.includes("127.0.0.1")
           ? false
           : { rejectUnauthorized: false },
     }))
  : (null as unknown as Pool);

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool
  ? drizzle(pool)
  : (new Proxy(
      {},
      {
        get() {
          throw new Error("DATABASE_URL is required to perform database operations");
        },
      },
    ) as ReturnType<typeof drizzle>);

