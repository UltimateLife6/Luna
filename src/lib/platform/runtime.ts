import { getCatalogDatabase } from "@/lib/catalog-store/db";
import { allowsSqlite, assertDatabaseUrl } from "@/lib/platform/env";
import { neonSql } from "@/lib/platform/postgres";
import type { Sql } from "@/lib/platform/sql";
import { sqliteSql } from "@/lib/platform/sqlite-sql";

let hosted: Sql | null = null;

export async function applicationSql(): Promise<Sql> {
  if (allowsSqlite()) {
    return sqliteSql(getCatalogDatabase());
  }

  if (!hosted) {
    hosted = neonSql(assertDatabaseUrl(process.env.DATABASE_URL));
  }

  return hosted;
}
