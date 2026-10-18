import { migrate, appliedMigrationVersions } from "@/lib/platform/migrate";
import { assertDatabaseUrl } from "@/lib/platform/env";
import { neonSql } from "@/lib/platform/postgres";
import { logError, logInfo } from "@/lib/platform/log";

async function main(): Promise<void> {
  try {
    const sql = neonSql(assertDatabaseUrl(process.env.DATABASE_URL));
    const applied = await migrate(sql);
    const versions = await appliedMigrationVersions(sql);
    logInfo("database", `Migrations applied this run: ${applied.join(", ") || "none"}. Current versions: ${versions.join(", ")}.`);
  } catch (error) {
    logError("database", error);
    process.exitCode = 1;
  }
}

void main();
