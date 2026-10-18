import { Pool, type PoolClient } from "@neondatabase/serverless";
import { logError } from "@/lib/platform/log";
import { postgresClientSql } from "@/lib/platform/sqlite-sql";
import { toPostgres, type Sql } from "@/lib/platform/sql";

let pool: Pool | null = null;

export function neonPool(connectionString: string): Pool {
  if (!pool) {
    pool = new Pool({ connectionString });
    pool.on("error", (error: unknown) => {
      logError("database", error);
    });
  }

  return pool;
}

function wrap(client: Pick<PoolClient, "query">): Sql {
  return postgresClientSql(
    {
      query: async (statement, params = []) => {
        const result = await client.query(toPostgres(statement), [...params]);
        return { rows: result.rows as Record<string, unknown>[], rowCount: result.rowCount };
      },
    },
    "postgres",
  );
}

export function neonSql(connectionString: string): Sql {
  const active = neonPool(connectionString);
  const base = wrap(active);

  return {
    ...base,
    async transaction(fn) {
      const client = await active.connect();

      try {
        await client.query("BEGIN");
        const result = await fn(wrap(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
