import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Sql } from "@/lib/platform/sql";

export type MigrationFile = { version: number; sql: string };

export function migrationsDirectory(): string {
  return path.join(process.cwd(), "src/lib/platform/migrations");
}

export async function readMigrationFiles(directory = migrationsDirectory()): Promise<MigrationFile[]> {
  const names = (await readdir(/*turbopackIgnore: true*/ directory)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();

  return Promise.all(
    names.map(async (name) => ({
      version: Number(name.slice(0, name.indexOf("_"))),
      sql: await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, name), "utf8"),
    })),
  );
}

export async function migrate(sql: Sql, directory = migrationsDirectory()): Promise<number[]> {
  await sql.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version integer PRIMARY KEY,
      applied_at text NOT NULL
    );
  `);

  const applied = await sql.query<{ version: number | string }>("SELECT version FROM schema_migrations");
  const have = new Set(applied.map((row) => Number(row.version)));
  const files = await readMigrationFiles(directory);
  const ran: number[] = [];

  for (const file of files) {
    if (have.has(file.version)) {
      continue;
    }

    await sql.transaction(async (tx) => {
      await tx.exec(file.sql);
      await tx.execute("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)", [file.version, new Date().toISOString()]);
    });
    ran.push(file.version);
  }

  return ran;
}

export async function appliedMigrationVersions(sql: Sql): Promise<number[]> {
  const rows = await sql.query<{ version: number | string }>("SELECT version FROM schema_migrations ORDER BY version");
  return rows.map((row) => Number(row.version));
}
