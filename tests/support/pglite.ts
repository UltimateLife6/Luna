import { PGlite, type PGliteInterface, type Transaction } from "@electric-sql/pglite";
import { toPostgres, type Sql } from "@/lib/platform/sql";

type Queryable = Pick<PGliteInterface, "query" | "exec"> | Pick<Transaction, "query" | "exec">;

function fromQueryable(queryable: Queryable): Sql {
  return {
    dialect: "postgres",
    async exec(statement) {
      await queryable.exec(statement);
    },
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      const result = await queryable.query<T>(toPostgres(statement), [...params]);
      return result.rows;
    },
    async execute(statement, params = []) {
      const result = await queryable.query(toPostgres(statement), [...params]);
      return { changes: Number(result.rowCount ?? result.affectedRows ?? 0) };
    },
    transaction() {
      return Promise.reject(new Error("Nested transactions are not supported."));
    },
  };
}

export async function openPglite(): Promise<Sql> {
  const database = new PGlite();
  await database.waitReady;
  const base = fromQueryable(database);

  return {
    ...base,
    transaction(fn) {
      return database.transaction(async (tx) => fn(fromQueryable(tx)));
    },
  };
}
