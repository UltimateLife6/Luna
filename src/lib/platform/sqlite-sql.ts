import type { DatabaseSync } from "node:sqlite";
import type { Sql } from "@/lib/platform/sql";
import { splitSql } from "@/lib/platform/sql";

export function sqliteSql(database: DatabaseSync): Sql {
  const direct: Sql = {
    dialect: "sqlite",
    async exec(statement) {
      database.exec(statement);
    },
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      return database.prepare(statement).all(...(params as never[])) as T[];
    },
    async execute(statement, params = []) {
      const result = database.prepare(statement).run(...(params as never[]));
      return { changes: Number(result.changes) };
    },
    async transaction(fn) {
      database.exec("BEGIN IMMEDIATE");

      try {
        const result = await fn(direct);
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
  };

  return direct;
}

export function postgresClientSql(
  queryable: {
    query: (statement: string, params?: readonly unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  },
  dialect: Sql["dialect"] = "postgres",
): Sql {
  const direct: Sql = {
    dialect,
    async exec(statement) {
      for (const part of splitSql(statement)) {
        await queryable.query(part);
      }
    },
    async query<T extends Record<string, unknown>>(statement: string, params: readonly unknown[] = []) {
      const result = await queryable.query(statement, params);
      return result.rows as T[];
    },
    async execute(statement, params = []) {
      const result = await queryable.query(statement, params);
      return { changes: Number(result.rowCount ?? 0) };
    },
    transaction() {
      return Promise.reject(new Error("Nested transactions are not supported."));
    },
  };

  return direct;
}
